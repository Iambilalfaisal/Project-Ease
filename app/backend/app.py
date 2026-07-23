import dataclasses
import io
import json
import logging
import mimetypes
import os
import time
from collections.abc import AsyncGenerator, Awaitable, Callable
from pathlib import Path
from typing import Any, cast

from azure.cognitiveservices.speech import (
    ResultReason,
    SpeechConfig,
    SpeechSynthesisOutputFormat,
    SpeechSynthesisResult,
    SpeechSynthesizer,
)
from azure.core.credentials import AzureKeyCredential
from azure.identity.aio import (
    AzureDeveloperCliCredential,
    ManagedIdentityCredential,
    get_bearer_token_provider,
)
from azure.monitor.opentelemetry import configure_azure_monitor
from azure.search.documents.aio import SearchClient
from azure.search.documents.indexes.aio import SearchIndexClient
from azure.search.documents.knowledgebases.aio import KnowledgeBaseRetrievalClient
from opentelemetry.instrumentation.aiohttp_client import AioHttpClientInstrumentor
from opentelemetry.instrumentation.asgi import OpenTelemetryMiddleware
from opentelemetry.instrumentation.httpx import (
    HTTPXClientInstrumentor,
)
from opentelemetry.instrumentation.openai import OpenAIInstrumentor
from quart import (
    Blueprint,
    Quart,
    abort,
    current_app,
    jsonify,
    make_response,
    request,
    send_file,
    send_from_directory,
)
from quart_cors import cors

from approaches.approach import Approach, DataPoints
from approaches.chatreadretrieveread import ChatReadRetrieveReadApproach
from approaches.promptmanager import PromptManager
from chat_history.cosmosdb import chat_history_cosmosdb_bp
from config import (
    CONFIG_AGENTIC_KNOWLEDGEBASE_ENABLED,
    CONFIG_AUTH_CLIENT,
    CONFIG_CHAT_APPROACH,
    CONFIG_CHAT_HISTORY_BROWSER_ENABLED,
    CONFIG_CHAT_HISTORY_COSMOS_ENABLED,
    CONFIG_CREDENTIAL,
    CONFIG_DEFAULT_REASONING_EFFORT,
    CONFIG_DEFAULT_RETRIEVAL_REASONING_EFFORT,
    CONFIG_GLOBAL_BLOB_MANAGER,
    CONFIG_INGESTER,
    CONFIG_KNOWLEDGEBASE_CLIENT,
    CONFIG_KNOWLEDGEBASE_CLIENT_WITH_SHAREPOINT,
    CONFIG_KNOWLEDGEBASE_CLIENT_WITH_WEB,
    CONFIG_KNOWLEDGEBASE_CLIENT_WITH_WEB_AND_SHAREPOINT,
    CONFIG_LANGUAGE_PICKER_ENABLED,
    CONFIG_MULTIMODAL_ENABLED,
    CONFIG_OPENAI_CLIENT,
    CONFIG_QUERY_REWRITING_ENABLED,
    CONFIG_RAG_SEARCH_IMAGE_EMBEDDINGS,
    CONFIG_RAG_SEARCH_TEXT_EMBEDDINGS,
    CONFIG_RAG_SEND_IMAGE_SOURCES,
    CONFIG_RAG_SEND_TEXT_SOURCES,
    CONFIG_REASONING_EFFORT_ENABLED,
    CONFIG_REASONING_EFFORT_OPTIONS,
    CONFIG_SEARCH_CLIENT,
    CONFIG_SEMANTIC_RANKER_DEPLOYED,
    CONFIG_SHAREPOINT_SOURCE_ENABLED,
    CONFIG_SPEECH_INPUT_ENABLED,
    CONFIG_SPEECH_OUTPUT_AZURE_ENABLED,
    CONFIG_SPEECH_OUTPUT_BROWSER_ENABLED,
    CONFIG_SPEECH_SERVICE_ID,
    CONFIG_SPEECH_SERVICE_LOCATION,
    CONFIG_SPEECH_SERVICE_TOKEN,
    CONFIG_SPEECH_SERVICE_VOICE,
    CONFIG_STREAMING_ENABLED,
    CONFIG_USER_BLOB_MANAGER,
    CONFIG_USER_UPLOAD_ENABLED,
    CONFIG_VECTOR_SEARCH_ENABLED,
    CONFIG_WEB_SOURCE_ENABLED,
)
from core.authentication import AuthenticationHelper
from core.sessionhelper import create_session_id
from decorators import authenticated, authenticated_path
from error import error_dict, error_response
from prepdocs import (
    OpenAIHost,
    setup_embeddings_service,
    setup_file_processors,
    setup_image_embeddings_service,
    setup_openai_client,
    setup_search_info,
)
from prepdocslib.blobmanager import AdlsBlobManager, BlobManager
from prepdocslib.embeddings import ImageEmbeddings
from prepdocslib.filestrategy import UploadUserFileStrategy
from prepdocslib.listfilestrategy import File

bp = Blueprint("routes", __name__, static_folder="static")
# Fix Windows registry issue with mimetypes
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("text/css", ".css")


@bp.route("/")
async def index():
    return await bp.send_static_file("index.html")


# Dedicated MSAL popup-redirect page. Per MSAL best practice this must be a
# minimal page that only loads the redirect-bridge script — no routing, no
# other application code — so we serve a separate redirect.html static asset
# (not index.html). msal-browser 5.x uses a BroadcastChannel handshake and
# the bridge script inside redirect.html posts the auth response back to the
# opener window and closes the popup.
# See https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/login-user.md#redirecturi-considerations
@bp.route("/redirect")
async def redirect():
    return await bp.send_static_file("redirect.html")


@bp.route("/favicon.ico")
async def favicon():
    return await bp.send_static_file("favicon.ico")


@bp.route("/assets/<path:path>")
async def assets(path):
    return await send_from_directory(Path(__file__).resolve().parent / "static" / "assets", path)


@bp.route("/content/<path>")
@authenticated_path
async def content_file(path: str, auth_claims: dict[str, Any]):
    """
    Serve content files from blob storage from within the app to keep the example self-contained.
    *** NOTE *** if you are using app services authentication, this route will return unauthorized to all users that are not logged in
    if AZURE_ENFORCE_ACCESS_CONTROL is not set or false, logged in users can access all files regardless of access control
    if AZURE_ENFORCE_ACCESS_CONTROL is set to true, logged in users can only access files they have access to
    This is also slow and memory hungry.
    """
    # Remove page number from path, filename-1.txt -> filename.txt
    # This shouldn't typically be necessary as browsers don't send hash fragments to servers
    if path.find("#page=") > 0:
        path_parts = path.rsplit("#page=", 1)
        path = path_parts[0]
    current_app.logger.info("Opening file %s", path)
    blob_manager: BlobManager = current_app.config[CONFIG_GLOBAL_BLOB_MANAGER]

    # Get bytes and properties from the blob manager
    result = await blob_manager.download_blob(path)

    if result is None:
        current_app.logger.info("Path not found in general Blob container: %s", path)
        if current_app.config[CONFIG_USER_UPLOAD_ENABLED]:
            user_oid = auth_claims["oid"]
            user_blob_manager: AdlsBlobManager = current_app.config[CONFIG_USER_BLOB_MANAGER]
            result = await user_blob_manager.download_blob(path, user_oid=user_oid)
            if result is None:
                current_app.logger.exception("Path not found in DataLake: %s", path)

    if not result:
        abort(404)

    content, properties = result

    if not properties or "content_settings" not in properties:
        abort(404)

    mime_type = properties["content_settings"]["content_type"]
    if mime_type == "application/octet-stream":
        mime_type = mimetypes.guess_type(path)[0] or "application/octet-stream"

    # Create a BytesIO object from the bytes
    blob_file = io.BytesIO(content)
    return await send_file(blob_file, mimetype=mime_type, as_attachment=False, attachment_filename=path)


def _safe_asdict(o: Any) -> Any:
    """Like dataclasses.asdict() but without deepcopy, and skips non-serializable objects."""
    if dataclasses.is_dataclass(o) and not isinstance(o, type):
        return {f.name: _safe_asdict(getattr(o, f.name)) for f in dataclasses.fields(o)}
    elif isinstance(o, list):
        return [_safe_asdict(v) for v in o]
    elif isinstance(o, dict):
        return {k: _safe_asdict(v) for k, v in o.items()}
    elif isinstance(o, tuple):
        return tuple(_safe_asdict(v) for v in o)
    elif isinstance(o, (str, int, float, bool)) or o is None:
        return o
    else:
        # Skip non-primitive objects (e.g. AsyncOpenAI client, thread locks)
        return None


class JSONEncoder(json.JSONEncoder):
    def default(self, o):
        if dataclasses.is_dataclass(o) and not isinstance(o, type):
            as_dict = _safe_asdict(o)
            if isinstance(o, DataPoints):
                return {k: v for k, v in as_dict.items() if v is not None}
            data_points_payload = as_dict.get("data_points") if isinstance(as_dict, dict) else None
            if isinstance(data_points_payload, dict) and data_points_payload.get("citation_activity_details") is None:
                data_points_payload.pop("citation_activity_details")
            return as_dict
        return super().default(o)


async def format_as_ndjson(r: AsyncGenerator[dict, None]) -> AsyncGenerator[str, None]:
    try:
        async for event in r:
            yield json.dumps(event, ensure_ascii=False, cls=JSONEncoder) + "\n"
    except Exception as error:
        logging.exception("Exception while generating response stream: %s", error)
        yield json.dumps(error_dict(error))


def _inject_employee_scope(context: dict) -> None:
    """PROJECT EASE: If the caller is an employee, restrict search to their permitted category docs."""
    pe = _get_session()
    if pe and pe.get("role") == "employee":
        user_id = pe.get("user_id") or ""
        org_id  = pe.get("org") or ""
        cat_ids = get_permitted_categories(user_id)
        docs    = get_docs_for_categories(org_id, cat_ids) if cat_ids else []
        context.setdefault("overrides", {})["permitted_sourcefiles"] = [d["filename"] for d in docs]


@bp.route("/chat", methods=["POST"])
@authenticated
async def chat(auth_claims: dict[str, Any]):
    if not request.is_json:
        return jsonify({"error": "request must be json"}), 415
    request_json = await request.get_json()
    context = request_json.get("context", {})
    context["auth_claims"] = auth_claims
    _inject_employee_scope(context)  # PROJECT EASE: employee category scoping
    try:
        approach: Approach = cast(Approach, current_app.config[CONFIG_CHAT_APPROACH])

        # If session state is provided, persists the session state,
        # else creates a new session_id depending on the chat history options enabled.
        session_state = request_json.get("session_state")
        if session_state is None:
            session_state = create_session_id(
                current_app.config[CONFIG_CHAT_HISTORY_COSMOS_ENABLED],
                current_app.config[CONFIG_CHAT_HISTORY_BROWSER_ENABLED],
            )
        result = await approach.run(
            request_json["messages"],
            context=context,
            session_state=session_state,
        )
        # Log the search — extract last user message as query
        try:
            messages = request_json.get("messages", [])
            query = next((m["content"] for m in reversed(messages) if m.get("role") == "user"), None)
            _audit(_get_session(), "search", details={"query": query})
        except Exception:
            pass
        return jsonify(result)
    except Exception as error:
        return error_response(error, "/chat")


@bp.route("/chat/stream", methods=["POST"])
@authenticated
async def chat_stream(auth_claims: dict[str, Any]):
    if not request.is_json:
        return jsonify({"error": "request must be json"}), 415
    request_json = await request.get_json()
    context = request_json.get("context", {})
    context["auth_claims"] = auth_claims
    _inject_employee_scope(context)  # PROJECT EASE: employee category scoping
    try:
        approach: Approach = cast(Approach, current_app.config[CONFIG_CHAT_APPROACH])

        # If session state is provided, persists the session state,
        # else creates a new session_id depending on the chat history options enabled.
        session_state = request_json.get("session_state")
        if session_state is None:
            session_state = create_session_id(
                current_app.config[CONFIG_CHAT_HISTORY_COSMOS_ENABLED],
                current_app.config[CONFIG_CHAT_HISTORY_BROWSER_ENABLED],
            )
        result = await approach.run_stream(
            request_json["messages"],
            context=context,
            session_state=session_state,
        )
        response = await make_response(format_as_ndjson(result))
        response.timeout = None  # type: ignore
        response.mimetype = "application/json-lines"
        return response
    except Exception as error:
        return error_response(error, "/chat")


# Send MSAL.js settings to the client UI
@bp.route("/auth_setup", methods=["GET"])
def auth_setup():
    auth_helper = current_app.config[CONFIG_AUTH_CLIENT]
    return jsonify(auth_helper.get_auth_setup_for_client())


# ─── PROJECT EASE: DB-backed auth ────────────────────────────────────────────
import secrets as _secrets
from db import (
    SYSTEM,
    init_db, get_user_by_email, check_password as _check_pw,
    get_org, get_categories, create_category, delete_category,
    get_documents, create_document, update_document_status, delete_document,
    get_doc_counts, get_users_for_org, create_user, delete_user,
    get_permitted_categories, set_permissions, get_docs_for_categories,
    get_user_by_id, get_user_by_whatsapp, update_user_whatsapp,
    # admin
    get_all_orgs, create_org, update_org, delete_org,
    get_org_details, get_platform_stats,
    # registration — Task #41
    register_org, get_pending_registrations, approve_registration, update_org_profile,
    # Matter/Client Management — Task #31
    get_clients, create_client, update_client, delete_client, get_client_with_matters,
    get_matter_teams, create_matter_team, update_matter_team, delete_matter_team,
    add_matter_team_member, remove_matter_team_member,
    get_custom_courts, add_custom_court, delete_custom_court,
    get_matters, create_matter, update_matter, delete_matter,
    get_matter_with_docs, link_document_to_matter, unlink_document_from_matter,
    # Audit Log — Task #30
    log_event, get_audit_logs, count_audit_logs,
    # Upgrade flow — Task #45
    PLAN_CONFIG, create_upgrade_request, get_upgrade_requests, resolve_upgrade_request,
    # Court Calendar — Task #32
    get_hearings, create_hearing, get_hearing, update_hearing, delete_hearing,
    get_deadlines, create_deadline, get_deadline, update_deadline, delete_deadline,
    get_hearings_needing_reminder, mark_hearing_reminder_sent,
    get_deadlines_needing_reminder, mark_deadline_reminder_sent,
    # Fee tracking & Invoices — Task #44
    get_fees, create_fee, get_fee, update_fee, delete_fee,
    get_invoices, create_invoice, get_invoice_with_fees, update_invoice,
    # Case Law — Task #33
    create_case_law_doc, get_case_law_doc, list_case_law_docs,
    set_case_law_doc_status, delete_case_law_doc,
)

# Initialise DB (creates tables + seeds dev data) at import time
init_db()

_sessions: dict[str, dict] = {}  # token → session dict  (in-memory; fine for MVP)


def _get_session(req=None) -> dict | None:
    r = req or request
    token = r.headers.get("Authorization", "").removeprefix("Bearer ").strip()
    return _sessions.get(token)


def _get_ip() -> str | None:
    """Best-effort caller IP from X-Forwarded-For or remote_addr."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.remote_addr or None


def _audit(session: dict | None, event_type: str, **kwargs):
    """Convenience wrapper — pulls org/user/actor fields from session."""
    log_event(
        event_type  = event_type,
        org_id      = (session or {}).get("org"),
        user_id     = (session or {}).get("user_id"),
        actor_name  = (session or {}).get("name"),
        actor_role  = (session or {}).get("role"),
        ip_address  = _get_ip(),
        **kwargs,
    )


@bp.route("/auth/login", methods=["POST"])
async def auth_login():
    """Check email + password against DB and return a session token."""
    data = await request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    # Platform admin — hardcoded (no org)
    if email == "admin@projectease.com" and password == "admin123":
        token = _secrets.token_hex(32)
        session_data = {"email": email, "name": "Platform Admin", "role": "platform_admin", "org": None}
        _sessions[token] = session_data
        log_event("login_success", actor_name=email, actor_role="platform_admin", ip_address=_get_ip(),
                  details={"email": email})
        return jsonify({"token": token, "user": session_data})

    user = get_user_by_email(email)
    if not user or not _check_pw(password, user["password_hash"]):
        log_event("login_fail", ip_address=_get_ip(), details={"email": email})
        return jsonify({"error": "Invalid email or password"}), 401

    token = _secrets.token_hex(32)
    session_data = {
        "user_id": user["user_id"],
        "email":   user["email"],
        "name":    user["name"],
        "role":    user["role"],
        "org":     user["org_id"],
    }
    _sessions[token] = session_data
    log_event("login_success",
              org_id=user["org_id"], user_id=user["user_id"],
              actor_name=user["name"], actor_role=user["role"],
              ip_address=_get_ip(), details={"email": email})
    return jsonify({
        "token": token,
        "user": {
            **session_data,
            "must_change_password": bool(user.get("must_change_password", 0)),
        },
    })


@bp.route("/auth/me", methods=["GET"])
async def auth_me():
    """Return the current user for a valid session token."""
    token = request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
    session = _sessions.get(token)
    if not session:
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify(session)


@bp.route("/auth/logout", methods=["POST"])
async def auth_logout():
    """Invalidate a session token."""
    token = request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
    session = _sessions.pop(token, None)
    _audit(session, "logout")
    return jsonify({"success": True})


# ─── PROJECT EASE: Document Upload ───────────────────────────────────────────
# Accepts any supported file type, tags with org_id, and indexes into AI Search.
# Supported: PDF (text + scanned), DOCX, PPTX, XLSX, PNG, JPG, TXT, CSV, MD
@bp.route("/upload", methods=["POST"])
async def upload_document():
    """Upload a document and index it into Azure AI Search for the caller's org."""
    # Auth check
    token = request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
    session = _sessions.get(token)
    if not session:
        return jsonify({"error": "Unauthorized"}), 401

    org_id: str | None = session.get("org")
    user_id: str | None = session.get("user_id")

    # ── Plan limit check ──────────────────────────────────────────────────────
    if org_id:
        org = get_org(org_id)
        if org:
            plan_key = org.get("plan", "trial")
            limits   = PLAN_CONFIG.get(plan_key, PLAN_CONFIG["trial"])
            counts   = get_doc_counts(org_id)
            if counts["total_docs"] >= limits["max_docs"]:
                return jsonify({
                    "error": f"Document limit reached ({limits['max_docs']} docs on {limits['label']} plan). "
                             "Please upgrade your plan to upload more documents.",
                    "limit_reached": "docs",
                }), 403
    # ─────────────────────────────────────────────────────────────────────────

    files = await request.files
    form  = await request.form
    if "file" not in files:
        return jsonify({"error": "No file provided"}), 400

    uploaded_file = files["file"]
    filename: str = uploaded_file.filename or "upload"
    category_id: str | None = form.get("category_id") or None

    # Allowed extensions
    ALLOWED_EXTENSIONS = {
        ".pdf", ".docx", ".pptx", ".xlsx",
        ".png", ".jpg", ".jpeg", ".tiff", ".bmp",
        ".txt", ".csv", ".md", ".json", ".html",
    }
    import os as _os
    ext = _os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return jsonify({"error": f"File type '{ext}' is not supported."}), 400

    try:
        import tempfile, asyncio as _asyncio
        from dotenv import load_dotenv as _ld
        _ld(dotenv_path=_os.path.join(_os.path.dirname(__file__), ".env"), override=True)

        from azure.core.credentials import AzureKeyCredential as _AKC
        from azure.core.credentials_async import AsyncTokenCredential
        from azure.identity.aio import AzureDeveloperCliCredential as _AzCred
        from prepdocslib.servicesetup import (
            OpenAIHost, setup_search_info, setup_blob_manager,
            setup_embeddings_service, setup_openai_client,
            build_file_processors, setup_figure_processor,
        )
        from prepdocslib.listfilestrategy import LocalListFileStrategy
        from prepdocslib.filestrategy import FileStrategy
        from prepdocslib.strategy import DocumentAction

        # ── credentials ──
        azure_credential = _AzCred(process_timeout=60)
        OPENAI_HOST = OpenAIHost(_os.environ["OPENAI_HOST"])

        search_key = _os.getenv("AZURE_SEARCH_KEY")
        search_cred = _AKC(search_key) if search_key else azure_credential

        search_info = setup_search_info(
            search_service=_os.environ["AZURE_SEARCH_SERVICE"],
            index_name=_os.environ["AZURE_SEARCH_INDEX"],
            azure_credential=azure_credential,
            search_key=search_key,
        )

        blob_manager = setup_blob_manager(
            azure_credential=azure_credential,
            storage_account=_os.environ["AZURE_STORAGE_ACCOUNT"],
            storage_container=_os.environ["AZURE_STORAGE_CONTAINER"],
            storage_resource_group=_os.environ.get("AZURE_STORAGE_RESOURCE_GROUP"),
            subscription_id=_os.environ.get("AZURE_SUBSCRIPTION_ID"),
            storage_key=_os.getenv("AZURE_STORAGE_KEY"),
        )

        openai_client, azure_openai_endpoint = setup_openai_client(
            openai_host=OPENAI_HOST,
            azure_credential=azure_credential,
            azure_openai_service=_os.getenv("AZURE_OPENAI_SERVICE"),
            azure_openai_api_key=_os.getenv("AZURE_OPENAI_API_KEY_OVERRIDE"),
        )

        doc_int_service = _os.getenv("AZURE_DOCUMENTINTELLIGENCE_SERVICE")
        doc_int_key = _os.getenv("AZURE_DOCUMENTINTELLIGENCE_KEY")

        file_processors, figure_processor = build_file_processors(
            azure_credential=azure_credential,
            document_intelligence_service=doc_int_service,
            document_intelligence_key=doc_int_key if doc_int_key and doc_int_key != "YOUR_DOC_INTELLIGENCE_KEY_HERE" else None,
            use_local_pdf_parser=not doc_int_service,
            use_local_html_parser=not doc_int_service,
        ), None

        # Unpack tuple from build_file_processors (returns dict, not tuple)
        if isinstance(file_processors, tuple):
            file_processors, figure_processor = file_processors

        embeddings_service = setup_embeddings_service(
            OPENAI_HOST,
            openai_client,
            emb_model_name=_os.environ["AZURE_OPENAI_EMB_MODEL_NAME"],
            emb_model_dimensions=int(_os.getenv("AZURE_OPENAI_EMB_DIMENSIONS", "1536")),
            azure_openai_deployment=_os.getenv("AZURE_OPENAI_EMB_DEPLOYMENT"),
            azure_openai_endpoint=azure_openai_endpoint,
        )

        # ── save upload to a temp file ──
        file_bytes = uploaded_file.read()
        size_bytes = len(file_bytes)
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name

        # Create DB record immediately (status=processing)
        doc_record = create_document(
            org_id=org_id or "",
            filename=filename,
            actor=user_id or SYSTEM,
            size_bytes=size_bytes,
            uploaded_by=user_id,
            category_id=category_id,
        )

        # ── Tag document with org_id via category field ──
        list_strategy = LocalListFileStrategy(path_pattern=tmp_path)

        strategy = FileStrategy(
            search_info=search_info,
            list_file_strategy=list_strategy,
            blob_manager=blob_manager,
            file_processors=file_processors,
            document_action=DocumentAction.Add,
            embeddings=embeddings_service,
            image_embeddings=None,
            search_field_name_embedding=_os.getenv("AZURE_SEARCH_FIELD_NAME_EMBEDDING", "embedding"),
            use_acls=False,
            category=org_id,       # ← org_id stored as category for tenant filtering
            figure_processor=figure_processor,
        )

        # ── Delete the md5 cache so the file always gets processed ──
        md5_path = tmp_path + ".md5"
        if _os.path.exists(md5_path):
            _os.remove(md5_path)

        loop = _asyncio.get_event_loop()
        await strategy.setup()
        await strategy.run()

        # cleanup
        _os.remove(tmp_path)
        if _os.path.exists(md5_path):
            _os.remove(md5_path)

        try:
            await blob_manager.close_clients()
            await openai_client.close()
            await azure_credential.close()
        except Exception:
            pass

        update_document_status(doc_record["doc_id"], "ready", actor=user_id or SYSTEM)
        _audit(_get_session(), "doc_upload",
               resource_type="document", resource_id=doc_record["doc_id"],
               resource_name=filename,
               details={"size_bytes": doc_record.get("size_bytes"), "category_id": category_id})
        return jsonify({"success": True, "filename": filename, "org": org_id, "doc": doc_record})

    except Exception as e:
        current_app.logger.exception("Upload failed: %s", e)
        return jsonify({"error": str(e)}), 500


# ─── PROJECT EASE: Documents API ─────────────────────────────────────────────

@bp.route("/me", methods=["GET"])
async def get_my_profile():
    """Return current user's profile and their permitted categories."""
    session = _get_session()
    if not session:
        return jsonify({"error": "Unauthorized"}), 401
    org_id  = session.get("org") or ""
    user_id = session.get("user_id") or ""
    org     = get_org(org_id) or {}
    cat_ids = set(get_permitted_categories(user_id))
    all_cats = get_categories(org_id)
    permitted = [c for c in all_cats if c["category_id"] in cat_ids]
    return jsonify({
        "user_id":              user_id,
        "name":                 session.get("name", ""),
        "email":                session.get("email", ""),
        "role":                 session.get("role", ""),
        "org_name":             org.get("name", ""),
        "permitted_categories": permitted,
    })


@bp.route("/documents", methods=["GET"])
async def list_documents():
    """Return documents for the caller's org. Employees see only permitted-category docs."""
    session = _get_session()
    if not session:
        return jsonify({"error": "Unauthorized"}), 401
    org_id = session.get("org") or ""

    if session.get("role") == "employee":
        user_id = session.get("user_id") or ""
        cat_ids = get_permitted_categories(user_id)
        docs    = get_docs_for_categories(org_id, cat_ids) if cat_ids else []
        total_bytes = sum((d.get("size_bytes") or 0) for d in docs)
        return jsonify({"documents": docs, "usage": {"total_docs": len(docs), "total_bytes": total_bytes}})

    docs   = get_documents(org_id)
    counts = get_doc_counts(org_id)
    return jsonify({"documents": docs, "usage": counts})


@bp.route("/documents/<doc_id>", methods=["DELETE"])
async def remove_document(doc_id: str):
    """Delete a document from the index, blob storage, and DB."""
    session = _get_session()
    if not session:
        return jsonify({"error": "Unauthorized"}), 401
    org_id = session.get("org")

    doc = delete_document(doc_id, org_id or "", actor=session.get("user_id") or SYSTEM)
    if not doc:
        return jsonify({"error": "Document not found"}), 404
    _audit(session, "doc_delete",
           resource_type="document", resource_id=doc_id,
           resource_name=doc.get("filename"))

    # Remove from Azure AI Search index
    try:
        import os as _os
        from dotenv import load_dotenv as _ld
        _ld(dotenv_path=_os.path.join(_os.path.dirname(__file__), ".env"), override=True)

        from azure.core.credentials import AzureKeyCredential as _AKC
        from azure.identity.aio import AzureDeveloperCliCredential as _AzCred
        from prepdocslib.servicesetup import setup_search_info, setup_blob_manager
        from prepdocslib.listfilestrategy import LocalListFileStrategy
        from prepdocslib.filestrategy import FileStrategy
        from prepdocslib.strategy import DocumentAction

        azure_credential = _AzCred(process_timeout=60)
        search_key = _os.getenv("AZURE_SEARCH_KEY")

        search_info = setup_search_info(
            search_service=_os.environ["AZURE_SEARCH_SERVICE"],
            index_name=_os.environ["AZURE_SEARCH_INDEX"],
            azure_credential=azure_credential,
            search_key=search_key,
        )
        blob_manager = setup_blob_manager(
            azure_credential=azure_credential,
            storage_account=_os.environ["AZURE_STORAGE_ACCOUNT"],
            storage_container=_os.environ["AZURE_STORAGE_CONTAINER"],
            storage_resource_group=_os.environ.get("AZURE_STORAGE_RESOURCE_GROUP"),
            subscription_id=_os.environ.get("AZURE_SUBSCRIPTION_ID"),
            storage_key=_os.getenv("AZURE_STORAGE_KEY"),
        )

        # FileStrategy with Remove action uses the filename to delete chunks from the index
        import tempfile, os as _os2
        # Create a dummy temp file so LocalListFileStrategy can resolve the path
        with tempfile.NamedTemporaryFile(delete=False, suffix=_os.path.splitext(doc["filename"])[1]) as tmp:
            tmp_path = tmp.name

        list_strategy = LocalListFileStrategy(path_pattern=tmp_path)
        # Rename temp file to match original filename for correct index key lookup
        target_path = _os2.path.join(_os2.path.dirname(tmp_path), doc["filename"])
        _os2.rename(tmp_path, target_path)

        strategy = FileStrategy(
            search_info=search_info,
            list_file_strategy=LocalListFileStrategy(path_pattern=target_path),
            blob_manager=blob_manager,
            file_processors={},
            document_action=DocumentAction.Remove,
            embeddings=None,
            image_embeddings=None,
            use_acls=False,
            category=org_id,
        )
        await strategy.setup()
        await strategy.run()
        _os2.remove(target_path)

        try:
            await blob_manager.close_clients()
            await azure_credential.close()
        except Exception:
            pass
    except Exception as e:
        current_app.logger.warning("Index removal failed (doc still deleted from DB): %s", e)

    return jsonify({"success": True, "doc_id": doc_id})


# ─── PROJECT EASE: Categories API ────────────────────────────────────────────

@bp.route("/categories", methods=["GET"])
async def list_categories():
    session = _get_session()
    if not session:
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify({"categories": get_categories(session.get("org") or "")})


@bp.route("/categories", methods=["POST"])
async def add_category():
    session = _get_session()
    if not session:
        return jsonify({"error": "Unauthorized"}), 401
    data = await request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Category name is required"}), 400
    try:
        cat = create_category(session.get("org") or "", name, actor=session.get("user_id") or SYSTEM)
        return jsonify(cat), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/categories/<category_id>", methods=["DELETE"])
async def remove_category(category_id: str):
    session = _get_session()
    if not session:
        return jsonify({"error": "Unauthorized"}), 401
    delete_category(category_id, session.get("org") or "", actor=session.get("user_id") or SYSTEM)
    return jsonify({"success": True})


# ─── PROJECT EASE: Org self-service API ──────────────────────────────────────

@bp.route("/org", methods=["GET"])
async def get_own_org():
    """Return the caller's own org record."""
    session = _get_session()
    if not session:
        return jsonify({"error": "Unauthorized"}), 401
    org = get_org(session.get("org") or "")
    if not org:
        return jsonify({"error": "Org not found"}), 404
    counts = get_doc_counts(session.get("org") or "")
    members = get_users_for_org(session.get("org") or "")
    return jsonify({**org, **counts, "user_count": len(members)})


@bp.route("/org", methods=["PUT"])
async def update_own_org():
    """Let an org owner update their org name / industry."""
    session = _get_session()
    if not session or session.get("role") != "org_owner":
        return jsonify({"error": "Unauthorized"}), 401
    data  = await request.get_json(silent=True) or {}
    actor = session.get("user_id") or SYSTEM
    updated = update_org(
        session.get("org") or "",
        actor=actor,
        name=data.get("name"),
        industry=data.get("industry"),
    )
    _audit(session, "org_update", details={"name": data.get("name"), "industry": data.get("industry")})
    return jsonify(updated)


# ─── PROJECT EASE: Self-service Registration ─────────────────────────────────

@bp.route("/register", methods=["POST"])
async def public_register():
    """Public endpoint — no auth. Creates org (pending_payment) + owner user."""
    import asyncio as _asyncio
    from email_helper import send_registration_pending as _send_pending

    data        = await request.get_json(silent=True) or {}
    firm_name   = (data.get("firm_name")   or "").strip()
    owner_name  = (data.get("owner_name")  or "").strip()
    owner_email = (data.get("owner_email") or "").strip().lower()
    password    = data.get("password", "")
    city        = (data.get("city")  or "").strip()
    phone       = (data.get("phone") or "").strip()
    plan        = data.get("plan", "pro")

    if not firm_name or not owner_name or not owner_email or not password:
        return jsonify({"error": "Firm name, your name, email, and password are required."}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters."}), 400
    if get_user_by_email(owner_email):
        return jsonify({"error": "An account with this email already exists."}), 409

    try:
        org = register_org(
            firm_name=firm_name,
            owner_name=owner_name,
            owner_email=owner_email,
            password=password,
            city=city,
            phone=phone,
            plan=plan,
        )
    except Exception as exc:
        current_app.logger.exception("Registration error: %s", exc)
        return jsonify({"error": "Registration failed. Please try again."}), 500

    # Fire-and-forget confirmation email
    try:
        await _asyncio.to_thread(_send_pending, owner_email, firm_name)
    except Exception:
        pass  # email failure must not block signup

    return jsonify({"success": True, "org_id": org["org_id"]}), 201


@bp.route("/admin/registrations", methods=["GET"])
async def admin_get_registrations():
    """List all orgs with pending_payment status."""
    err = _require_platform_admin()
    if err:
        return err
    return jsonify({"registrations": get_pending_registrations()})


@bp.route("/admin/orgs/<org_id>/approve", methods=["PATCH"])
async def admin_approve_org(org_id: str):
    """Approve a pending registration → active + send email."""
    import asyncio as _asyncio
    from email_helper import send_registration_approved as _send_approved

    err = _require_platform_admin()
    if err:
        return err
    admin_session = _get_session()
    actor = (admin_session or {}).get("email") or SYSTEM

    org = approve_registration(org_id, actor=actor)
    if not org:
        return jsonify({"error": "Organization not found or already active."}), 404

    # Send approval email to org owner
    details = get_org_details(org_id)
    if details and details.get("users"):
        owner = next(
            (u for u in details["users"] if u.get("role") == "org_owner"), None
        )
        if owner:
            try:
                await _asyncio.to_thread(
                    _send_approved, owner["email"], org["name"]
                )
            except Exception:
                pass

    return jsonify({"success": True, "org": org})


@bp.route("/org/profile", methods=["PUT"])
async def update_org_profile_route():
    """Owner-only: update optional profile fields (phone, city, practice_areas, etc.)."""
    session = _get_session()
    if not session or session.get("role") != "org_owner":
        return jsonify({"error": "Unauthorized"}), 401
    data  = await request.get_json(silent=True) or {}
    actor = session.get("user_id") or SYSTEM
    updated = update_org_profile(
        session.get("org") or "",
        actor=actor,
        phone=data.get("phone"),
        city=data.get("city"),
        practice_areas=data.get("practice_areas"),
        bar_council_no=data.get("bar_council_no"),
        website=data.get("website"),
        team_size=data.get("team_size"),
    )
    return jsonify(updated or {})


@bp.route("/auth/change-password", methods=["POST"])
async def change_password():
    """Verify current password then set a new one."""
    session = _get_session()
    if not session:
        return jsonify({"error": "Unauthorized"}), 401
    data = await request.get_json(silent=True) or {}
    current_pw  = data.get("current_password", "")
    new_pw      = data.get("new_password", "")
    if not current_pw or not new_pw:
        return jsonify({"error": "Both current and new password are required"}), 400
    if len(new_pw) < 8:
        return jsonify({"error": "New password must be at least 8 characters"}), 400

    user = get_user_by_email(session.get("email") or "")
    if not user or not _check_pw(current_pw, user["password_hash"]):
        return jsonify({"error": "Current password is incorrect"}), 401

    from db import hash_password as _hash_pw
    actor = session.get("user_id") or SYSTEM
    with __import__("db").get_conn() as conn:
        conn.execute(
            """UPDATE users SET password_hash=?, must_change_password=0,
               modified_at=datetime('now'), modified_by=? WHERE user_id=?""",
            (_hash_pw(new_pw), actor, user["user_id"]),
        )
    _audit(session, "password_change", resource_type="user", resource_id=user["user_id"])
    return jsonify({"success": True})


# ─── PROJECT EASE: Team API ───────────────────────────────────────────────────

@bp.route("/team", methods=["GET"])
async def list_team():
    session = _get_session()
    if not session:
        return jsonify({"error": "Unauthorized"}), 401
    members = get_users_for_org(session.get("org") or "")
    return jsonify({"members": members})


@bp.route("/team", methods=["POST"])
async def invite_member():
    session = _get_session()
    if not session or session.get("role") != "org_owner":
        return jsonify({"error": "Unauthorized"}), 401
    data = await request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    name  = (data.get("name") or "").strip()
    role  = data.get("role", "employee")
    if not email or not name:
        return jsonify({"error": "Name and email are required"}), 400

    # ── Plan limit check ──────────────────────────────────────────────────────
    org_id_check = session.get("org") or ""
    org_check    = get_org(org_id_check)
    if org_check:
        plan_key = org_check.get("plan", "trial")
        limits   = PLAN_CONFIG.get(plan_key, PLAN_CONFIG["trial"])
        current_users = len(get_users_for_org(org_id_check))
        if current_users >= limits["max_users"]:
            return jsonify({
                "error": f"User limit reached ({limits['max_users']} users on {limits['label']} plan). "
                         "Please upgrade your plan to add more team members.",
                "limit_reached": "users",
            }), 403
    # ─────────────────────────────────────────────────────────────────────────

    # Generate a temp password; real flow would email this
    temp_pw = _secrets.token_urlsafe(8)
    try:
        user = create_user(
            org_id=session.get("org") or "",
            email=email, name=name, role=role,
            actor=session.get("user_id") or SYSTEM,
            password=temp_pw, must_change=True,
        )
        _audit(session, "member_invite",
               resource_type="user", resource_id=user["user_id"],
               resource_name=name, details={"email": email, "role": role})
        return jsonify({**user, "temp_password": temp_pw}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/team/<user_id>", methods=["DELETE"])
async def remove_member(user_id: str):
    session = _get_session()
    if not session or session.get("role") != "org_owner":
        return jsonify({"error": "Unauthorized"}), 401
    # Invalidate any active sessions for this user
    removed_user = get_user_by_id(user_id)
    for tok, s in list(_sessions.items()):
        if s.get("user_id") == user_id:
            _sessions.pop(tok, None)
    delete_user(user_id, actor=session.get("user_id") or SYSTEM)
    _audit(session, "member_remove",
           resource_type="user", resource_id=user_id,
           resource_name=(removed_user or {}).get("name"))
    return jsonify({"success": True})


@bp.route("/team/<user_id>/permissions", methods=["GET"])
async def get_member_permissions(user_id: str):
    session = _get_session()
    if not session:
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify({"category_ids": get_permitted_categories(user_id)})


@bp.route("/team/<user_id>/permissions", methods=["PUT"])
async def set_member_permissions(user_id: str):
    session = _get_session()
    if not session or session.get("role") != "org_owner":
        return jsonify({"error": "Unauthorized"}), 401
    data = await request.get_json(silent=True) or {}
    category_ids = data.get("category_ids", [])
    set_permissions(user_id, category_ids, actor=session.get("user_id") or SYSTEM)
    return jsonify({"success": True})


@bp.route("/team/<user_id>/whatsapp", methods=["PATCH"])
async def update_member_whatsapp(user_id: str):
    """Set or clear the WhatsApp number for a team member (owner only)."""
    session = _get_session()
    if not session or session.get("role") != "org_owner":
        return jsonify({"error": "Unauthorized"}), 401
    data    = await request.get_json(silent=True) or {}
    number  = (data.get("whatsapp_number") or "").strip()
    if number and not number.startswith("+"):
        number = "+" + number
    org_id  = session.get("org") or ""
    member  = get_user_by_id(user_id)
    if not member or member.get("org_id") != org_id:
        return jsonify({"error": "User not found"}), 404
    update_user_whatsapp(user_id, number or None, session.get("user_id") or SYSTEM)
    return jsonify({"success": True, "whatsapp_number": number or None})


# ─── PROJECT EASE: WhatsApp Webhook ──────────────────────────────────────────

# In-memory conversation history keyed by phone number (survives restarts poorly
# but is sufficient for MVP — a Redis cache can replace this later).
_wa_sessions: dict[str, list] = {}


def _twiml_reply(text: str):
    """Return a Twilio TwiML XML response containing a WhatsApp message."""
    safe = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    xml  = f'<?xml version="1.0" encoding="UTF-8"?><Response><Message>{safe}</Message></Response>'
    return current_app.response_class(xml, mimetype="text/xml")


async def _transcribe_voice(media_url: str) -> str | None:
    """Download a Twilio voice note and transcribe it with Azure OpenAI Whisper.
    Returns None if no Whisper deployment is configured or if transcription fails."""
    whisper_dep = os.getenv("AZURE_OPENAI_WHISPER_DEPLOYMENT", "").strip()
    if not whisper_dep:
        return None
    try:
        import httpx
        sid   = os.getenv("TWILIO_ACCOUNT_SID", "")
        token = os.getenv("TWILIO_AUTH_TOKEN", "")
        auth  = (sid, token) if sid and token else None
        async with httpx.AsyncClient() as client:
            r = await client.get(media_url, auth=auth, timeout=30.0)
            r.raise_for_status()
            audio_bytes = r.content
            content_type = r.headers.get("content-type", "audio/ogg")
        openai_client = current_app.config[CONFIG_OPENAI_CLIENT]
        result = await openai_client.audio.transcriptions.create(
            model=whisper_dep,
            file=("voice_note.ogg", audio_bytes, content_type),
        )
        return result.text.strip() or None
    except Exception as exc:
        logging.warning("Whisper transcription failed: %s", exc)
        return None


@bp.route("/webhook/whatsapp", methods=["POST"])
async def whatsapp_webhook():
    """Twilio WhatsApp webhook — receives messages, runs them through the chat
    pipeline, and returns a TwiML reply."""
    form        = await request.form
    from_raw    = form.get("From", "")                  # "whatsapp:+923001234567"
    body        = (form.get("Body") or "").strip()
    media_type  = form.get("MediaContentType0", "")
    media_url   = form.get("MediaUrl0", "")

    # Strip the "whatsapp:" prefix Twilio prepends
    phone = from_raw.removeprefix("whatsapp:").strip()
    if not phone:
        return _twiml_reply("Could not identify your number. Please contact support.")

    user = get_user_by_whatsapp(phone)
    if not user:
        return _twiml_reply(
            "Hi! Your WhatsApp number is not registered with Project Ease. "
            "Please ask your firm administrator to add it to your account."
        )

    # ── Determine query text ──────────────────────────────────────────────────
    if media_url and "audio" in media_type:
        transcript = await _transcribe_voice(media_url)
        if transcript is None:
            return _twiml_reply(
                "Voice messages are not supported yet — please send your question as text."
            )
        query_text = transcript
    elif body:
        query_text = body
    else:
        return _twiml_reply("Please send a text or voice message with your question.")

    # ── Maintain per-number conversation history (last 10 turns) ─────────────
    history = _wa_sessions.setdefault(phone, [])
    history.append({"role": "user", "content": query_text})
    if len(history) > 10:
        _wa_sessions[phone] = history[-10:]
        history = _wa_sessions[phone]

    # ── Build employee scope (same logic as _inject_employee_scope) ───────────
    cat_ids    = get_permitted_categories(user["user_id"])
    docs       = get_docs_for_categories(user["org_id"], cat_ids) if cat_ids else []
    permitted  = [d["filename"] for d in docs]

    # ── Run through the chat pipeline ─────────────────────────────────────────
    approach: Approach = cast(Approach, current_app.config[CONFIG_CHAT_APPROACH])
    try:
        result = await approach.run(
            messages=history.copy(),
            context={
                "overrides": {
                    "retrieval_mode":  "hybrid",
                    "semantic_ranker": True,
                    "top":             3,
                    "permitted_sourcefiles": permitted,
                },
                "auth_claims": {
                    "organization_id": user["org_id"],
                },
            },
        )
        answer = (result.get("output_text") or "").strip()
        if not answer:
            answer = "I could not find a relevant answer in your firm's documents. Please try rephrasing your question."
    except Exception as exc:
        logging.exception("WhatsApp chat pipeline error: %s", exc)
        answer = "Sorry, I ran into an error processing your request. Please try again in a moment."

    # Add assistant reply to history
    history.append({"role": "assistant", "content": answer})

    # WhatsApp messages are capped at 1600 characters
    if len(answer) > 1500:
        answer = answer[:1497] + "…"

    return _twiml_reply(answer)


# ─── PROJECT EASE: Super Admin API ───────────────────────────────────────────

def _require_platform_admin():
    session = _get_session()
    if not session or session.get("role") != "platform_admin":
        return jsonify({"error": "Forbidden"}), 403
    return None


@bp.route("/admin/stats", methods=["GET"])
async def admin_stats():
    err = _require_platform_admin()
    if err: return err
    return jsonify(get_platform_stats())


@bp.route("/admin/orgs", methods=["GET"])
async def admin_list_orgs():
    err = _require_platform_admin()
    if err: return err
    return jsonify({"orgs": get_all_orgs()})


@bp.route("/admin/orgs", methods=["POST"])
async def admin_create_org():
    err = _require_platform_admin()
    if err: return err
    data = await request.get_json(silent=True) or {}
    name     = (data.get("name") or "").strip()
    plan     = data.get("plan", "free")
    industry = data.get("industry", "Other")
    owner_name  = (data.get("owner_name") or "").strip()
    owner_email = (data.get("owner_email") or "").strip().lower()
    if not name or not owner_name or not owner_email:
        return jsonify({"error": "Org name, owner name, and owner email are required"}), 400
    try:
        admin_session = _get_session()
        admin_id = (admin_session or {}).get("email") or SYSTEM
        org = create_org(name=name, plan=plan, industry=industry, actor=admin_id)
        temp_pw = _secrets.token_urlsafe(10)
        owner = create_user(
            org_id=org["org_id"], email=owner_email,
            name=owner_name, role="org_owner",
            actor=admin_id,
            password=temp_pw, must_change=True,
        )
        return jsonify({"org": org, "owner": owner, "temp_password": temp_pw}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/admin/orgs/<org_id>", methods=["GET"])
async def admin_get_org(org_id: str):
    err = _require_platform_admin()
    if err: return err
    details = get_org_details(org_id)
    if not details:
        return jsonify({"error": "Not found"}), 404
    return jsonify(details)


@bp.route("/admin/orgs/<org_id>", methods=["PUT"])
async def admin_update_org(org_id: str):
    err = _require_platform_admin()
    if err: return err
    data = await request.get_json(silent=True) or {}
    admin_session = _get_session()
    admin_id = (admin_session or {}).get("email") or SYSTEM
    updated = update_org(org_id, actor=admin_id, **data)
    if not updated:
        return jsonify({"error": "Not found"}), 404
    # If org was suspended, invalidate all its sessions
    if data.get("status") == "suspended":
        for tok, s in list(_sessions.items()):
            if s.get("org") == org_id:
                _sessions.pop(tok, None)
    return jsonify(updated)


@bp.route("/admin/orgs/<org_id>", methods=["DELETE"])
async def admin_delete_org(org_id: str):
    err = _require_platform_admin()
    if err: return err
    # Invalidate all sessions for this org
    for tok, s in list(_sessions.items()):
        if s.get("org") == org_id:
            _sessions.pop(tok, None)
    admin_session = _get_session()
    admin_id = (admin_session or {}).get("email") or SYSTEM
    delete_org(org_id, actor=admin_id)
    return jsonify({"success": True})


# PROJECT EASE: admin eval endpoints
# Protected by a shared secret — set ADMIN_EVAL_API_KEY in your environment.
# Callers must send:  Authorization: Bearer <ADMIN_EVAL_API_KEY>
# This keeps law-firm query data from leaking to unauthenticated callers.
def _require_admin_key():
    """Returns an error response if the bearer token is missing or wrong, else None."""
    expected = os.environ.get("ADMIN_EVAL_API_KEY", "")
    if not expected:
        # Key not configured → block all access (fail-closed, not fail-open)
        return jsonify({"error": "Admin API is disabled. Set ADMIN_EVAL_API_KEY to enable it."}), 403
    auth_header = request.headers.get("Authorization", "")
    provided = auth_header.removeprefix("Bearer ").strip()
    if not provided or provided != expected:
        return jsonify({"error": "Unauthorized"}), 401
    return None


@bp.route("/admin/evals", methods=["GET"])
async def admin_evals():
    """Return recent eval results. Optional ?org=<org_id> to filter by tenant."""
    if err := _require_admin_key():
        return err
    from evals.db import fetch_recent, fetch_summary
    org = request.args.get("org")
    results = fetch_recent(limit=100)
    if org:
        results = [r for r in results if r.get("organization_id") == org]
    summary = fetch_summary(organization_id=org)
    return jsonify({"summary": summary, "results": results})


@bp.route("/admin/evals/summary", methods=["GET"])
async def admin_evals_summary():
    """Aggregate stats across all orgs or a specific org."""
    if err := _require_admin_key():
        return err
    from evals.db import fetch_summary
    org = request.args.get("org")
    return jsonify(fetch_summary(organization_id=org))


@bp.route("/config", methods=["GET"])
def config():
    return jsonify(
        {
            "showMultimodalOptions": current_app.config[CONFIG_MULTIMODAL_ENABLED],
            "showSemanticRankerOption": current_app.config[CONFIG_SEMANTIC_RANKER_DEPLOYED],
            "showQueryRewritingOption": current_app.config[CONFIG_QUERY_REWRITING_ENABLED],
            "showReasoningEffortOption": current_app.config[CONFIG_REASONING_EFFORT_ENABLED],
            "streamingEnabled": current_app.config[CONFIG_STREAMING_ENABLED],
            "defaultReasoningEffort": current_app.config[CONFIG_DEFAULT_REASONING_EFFORT],
            "reasoningEffortOptions": current_app.config[CONFIG_REASONING_EFFORT_OPTIONS],
            "defaultRetrievalReasoningEffort": current_app.config[CONFIG_DEFAULT_RETRIEVAL_REASONING_EFFORT],
            "showVectorOption": current_app.config[CONFIG_VECTOR_SEARCH_ENABLED],
            "showUserUpload": current_app.config[CONFIG_USER_UPLOAD_ENABLED],
            "showLanguagePicker": current_app.config[CONFIG_LANGUAGE_PICKER_ENABLED],
            "showSpeechInput": current_app.config[CONFIG_SPEECH_INPUT_ENABLED],
            "showSpeechOutputBrowser": current_app.config[CONFIG_SPEECH_OUTPUT_BROWSER_ENABLED],
            "showSpeechOutputAzure": current_app.config[CONFIG_SPEECH_OUTPUT_AZURE_ENABLED],
            "showChatHistoryBrowser": current_app.config[CONFIG_CHAT_HISTORY_BROWSER_ENABLED],
            "showChatHistoryCosmos": current_app.config[CONFIG_CHAT_HISTORY_COSMOS_ENABLED],
            "showAgenticRetrievalOption": current_app.config[CONFIG_AGENTIC_KNOWLEDGEBASE_ENABLED],
            "ragSearchTextEmbeddings": current_app.config[CONFIG_RAG_SEARCH_TEXT_EMBEDDINGS],
            "ragSearchImageEmbeddings": current_app.config[CONFIG_RAG_SEARCH_IMAGE_EMBEDDINGS],
            "ragSendTextSources": current_app.config[CONFIG_RAG_SEND_TEXT_SOURCES],
            "ragSendImageSources": current_app.config[CONFIG_RAG_SEND_IMAGE_SOURCES],
            "webSourceEnabled": current_app.config[CONFIG_WEB_SOURCE_ENABLED],
            "sharepointSourceEnabled": current_app.config[CONFIG_SHAREPOINT_SOURCE_ENABLED],
        }
    )


@bp.route("/speech", methods=["POST"])
async def speech():
    if not request.is_json:
        return jsonify({"error": "request must be json"}), 415

    speech_token = current_app.config.get(CONFIG_SPEECH_SERVICE_TOKEN)
    if speech_token is None or speech_token.expires_on < time.time() + 60:
        speech_token = await current_app.config[CONFIG_CREDENTIAL].get_token(
            "https://cognitiveservices.azure.com/.default"
        )
        current_app.config[CONFIG_SPEECH_SERVICE_TOKEN] = speech_token

    request_json = await request.get_json()
    text = request_json["text"]
    try:
        # Construct a token as described in documentation:
        # https://learn.microsoft.com/azure/ai-services/speech-service/how-to-configure-azure-ad-auth?pivots=programming-language-python
        auth_token = (
            "aad#"
            + current_app.config[CONFIG_SPEECH_SERVICE_ID]
            + "#"
            + current_app.config[CONFIG_SPEECH_SERVICE_TOKEN].token
        )
        speech_config = SpeechConfig(auth_token=auth_token, region=current_app.config[CONFIG_SPEECH_SERVICE_LOCATION])
        speech_config.speech_synthesis_voice_name = current_app.config[CONFIG_SPEECH_SERVICE_VOICE]
        speech_config.set_speech_synthesis_output_format(SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3)
        synthesizer = SpeechSynthesizer(speech_config=speech_config, audio_config=None)
        result: SpeechSynthesisResult = synthesizer.speak_text_async(text).get()
        if result.reason == ResultReason.SynthesizingAudioCompleted:
            return result.audio_data, 200, {"Content-Type": "audio/mp3"}
        elif result.reason == ResultReason.Canceled:
            cancellation_details = result.cancellation_details
            current_app.logger.error(
                "Speech synthesis canceled: %s %s", cancellation_details.reason, cancellation_details.error_details
            )
            raise Exception("Speech synthesis canceled. Check logs for details.")
        else:
            current_app.logger.error("Unexpected result reason: %s", result.reason)
            raise Exception("Speech synthesis failed. Check logs for details.")
    except Exception as e:
        current_app.logger.exception("Exception in /speech")
        return jsonify({"error": str(e)}), 500


@bp.post("/upload")
@authenticated
async def upload(auth_claims: dict[str, Any]):
    request_files = await request.files
    if "file" not in request_files:
        return jsonify({"message": "No file part in the request", "status": "failed"}), 400

    try:
        user_oid = auth_claims["oid"]
        file = request_files.getlist("file")[0]
        adls_manager: AdlsBlobManager = current_app.config[CONFIG_USER_BLOB_MANAGER]
        file_url = await adls_manager.upload_blob(file, file.filename, user_oid)
        ingester: UploadUserFileStrategy = current_app.config[CONFIG_INGESTER]
        await ingester.add_file(File(content=file, url=file_url, acls={"oids": [user_oid]}), user_oid=user_oid)
        return jsonify({"message": "File uploaded successfully"}), 200
    except Exception as error:
        current_app.logger.error("Error uploading file: %s", error)
        return jsonify({"message": "Error uploading file, check server logs for details.", "status": "failed"}), 500


@bp.post("/delete_uploaded")
@authenticated
async def delete_uploaded(auth_claims: dict[str, Any]):
    request_json = await request.get_json()
    filename = request_json.get("filename")
    user_oid = auth_claims["oid"]
    adls_manager: AdlsBlobManager = current_app.config[CONFIG_USER_BLOB_MANAGER]
    await adls_manager.remove_blob(filename, user_oid)
    ingester: UploadUserFileStrategy = current_app.config[CONFIG_INGESTER]
    await ingester.remove_file(filename, user_oid)
    return jsonify({"message": f"File {filename} deleted successfully"}), 200


@bp.get("/list_uploaded")
@authenticated
async def list_uploaded(auth_claims: dict[str, Any]):
    """Lists the uploaded documents for the current user.
    Only returns files directly in the user's directory, not in subdirectories.
    Excludes image files and the images directory."""
    user_oid = auth_claims["oid"]
    adls_manager: AdlsBlobManager = current_app.config[CONFIG_USER_BLOB_MANAGER]
    files = await adls_manager.list_blobs(user_oid)
    return jsonify(files), 200


# ─── PROJECT EASE: Clients API ───────────────────────────────────────────────

@bp.route("/clients", methods=["GET"])
async def list_clients():
    session = _get_session()
    if not session:
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify({"clients": get_clients(session.get("org") or "")})


@bp.route("/clients", methods=["POST"])
async def add_client():
    session = _get_session()
    if not session or session.get("role") != "org_owner":
        return jsonify({"error": "Unauthorized"}), 401
    data = await request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Client name is required"}), 400
    client = create_client(
        org_id=session.get("org") or "",
        name=name,
        client_type=data.get("client_type", "Individual"),
        email=data.get("email") or None,
        phone=data.get("phone") or None,
        address=data.get("address") or None,
        cnic_ntn=data.get("cnic_ntn") or None,
        notes=data.get("notes") or None,
        actor=session.get("user_id") or SYSTEM,
    )
    _audit(session, "client_create",
           resource_type="client", resource_id=client["client_id"], resource_name=name)
    return jsonify(client), 201


@bp.route("/clients/<client_id>", methods=["GET"])
async def get_client_detail(client_id: str):
    session = _get_session()
    if not session:
        return jsonify({"error": "Unauthorized"}), 401
    client = get_client_with_matters(client_id, session.get("org") or "")
    if not client:
        return jsonify({"error": "Not found"}), 404
    return jsonify(client)


@bp.route("/clients/<client_id>", methods=["PATCH"])
async def edit_client(client_id: str):
    session = _get_session()
    if not session or session.get("role") != "org_owner":
        return jsonify({"error": "Unauthorized"}), 401
    data = await request.get_json(silent=True) or {}
    updated = update_client(
        client_id, session.get("org") or "",
        actor=session.get("user_id") or SYSTEM,
        **data,
    )
    if not updated:
        return jsonify({"error": "Not found"}), 404
    _audit(session, "client_update",
           resource_type="client", resource_id=client_id,
           resource_name=(updated or {}).get("name"))
    return jsonify(updated)


@bp.route("/clients/<client_id>", methods=["DELETE"])
async def remove_client(client_id: str):
    session = _get_session()
    if not session or session.get("role") != "org_owner":
        return jsonify({"error": "Unauthorized"}), 401
    delete_client(client_id, session.get("org") or "",
                  actor=session.get("user_id") or SYSTEM)
    _audit(session, "client_delete", resource_type="client", resource_id=client_id)
    return jsonify({"success": True})


# ─── PROJECT EASE: Matter Teams API ──────────────────────────────────────────

@bp.route("/matter-teams", methods=["GET"])
async def list_matter_teams():
    session = _get_session()
    if not session:
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify({"teams": get_matter_teams(session.get("org") or "")})


@bp.route("/matter-teams", methods=["POST"])
async def add_matter_team():
    session = _get_session()
    if not session or session.get("role") != "org_owner":
        return jsonify({"error": "Unauthorized"}), 401
    data = await request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Team name is required"}), 400
    team = create_matter_team(session.get("org") or "", name,
                              actor=session.get("user_id") or SYSTEM)
    return jsonify(team), 201


@bp.route("/matter-teams/<team_id>", methods=["PATCH"])
async def edit_matter_team(team_id: str):
    session = _get_session()
    if not session or session.get("role") != "org_owner":
        return jsonify({"error": "Unauthorized"}), 401
    data = await request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Team name is required"}), 400
    updated = update_matter_team(team_id, session.get("org") or "", name,
                                 actor=session.get("user_id") or SYSTEM)
    return jsonify(updated or {})


@bp.route("/matter-teams/<team_id>", methods=["DELETE"])
async def remove_matter_team(team_id: str):
    session = _get_session()
    if not session or session.get("role") != "org_owner":
        return jsonify({"error": "Unauthorized"}), 401
    delete_matter_team(team_id, session.get("org") or "",
                       actor=session.get("user_id") or SYSTEM)
    return jsonify({"success": True})


@bp.route("/matter-teams/<team_id>/members/<member_user_id>", methods=["POST"])
async def add_member_to_matter_team(team_id: str, member_user_id: str):
    session = _get_session()
    if not session or session.get("role") != "org_owner":
        return jsonify({"error": "Unauthorized"}), 401
    add_matter_team_member(team_id, member_user_id,
                           actor=session.get("user_id") or SYSTEM)
    return jsonify({"success": True})


@bp.route("/matter-teams/<team_id>/members/<member_user_id>", methods=["DELETE"])
async def remove_member_from_matter_team(team_id: str, member_user_id: str):
    session = _get_session()
    if not session or session.get("role") != "org_owner":
        return jsonify({"error": "Unauthorized"}), 401
    remove_matter_team_member(team_id, member_user_id,
                              actor=session.get("user_id") or SYSTEM)
    return jsonify({"success": True})


# ─── PROJECT EASE: Courts API ─────────────────────────────────────────────────

_DEFAULT_COURTS = [
    "Supreme Court of Pakistan", "Federal Shariat Court",
    "Lahore High Court", "Sindh High Court", "Islamabad High Court",
    "Peshawar High Court", "Balochistan High Court",
    "Gilgit-Baltistan Chief Court", "Azad Kashmir High Court",
    "District & Sessions Court", "Civil Judge Court", "Magistrate Court",
    "Banking Court", "Labour Court", "National Accountability Court",
    "Customs Appellate Tribunal", "Income Tax Appellate Tribunal",
    "Anti-Corruption Establishment Court", "Service Tribunal", "Family Court",
]


@bp.route("/courts", methods=["GET"])
async def list_courts():
    session = _get_session()
    if not session:
        return jsonify({"error": "Unauthorized"}), 401
    custom = get_custom_courts(session.get("org") or "")
    return jsonify({"default": _DEFAULT_COURTS, "custom": custom})


@bp.route("/courts", methods=["POST"])
async def add_court():
    session = _get_session()
    if not session or session.get("role") != "org_owner":
        return jsonify({"error": "Unauthorized"}), 401
    data = await request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Court name is required"}), 400
    try:
        court = add_custom_court(session.get("org") or "", name,
                                 actor=session.get("user_id") or SYSTEM)
        return jsonify(court), 201
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400


@bp.route("/courts/<court_id>", methods=["DELETE"])
async def remove_court(court_id: str):
    session = _get_session()
    if not session or session.get("role") != "org_owner":
        return jsonify({"error": "Unauthorized"}), 401
    delete_custom_court(court_id, session.get("org") or "",
                        actor=session.get("user_id") or SYSTEM)
    return jsonify({"success": True})


# ─── PROJECT EASE: Matters API ────────────────────────────────────────────────

@bp.route("/matters", methods=["GET"])
async def list_matters():
    session = _get_session()
    if not session:
        return jsonify({"error": "Unauthorized"}), 401
    client_id = request.args.get("client_id") or None
    return jsonify({"matters": get_matters(session.get("org") or "", client_id=client_id)})


@bp.route("/matters", methods=["POST"])
async def add_matter():
    session = _get_session()
    if not session or session.get("role") != "org_owner":
        return jsonify({"error": "Unauthorized"}), 401
    data        = await request.get_json(silent=True) or {}
    client_id   = (data.get("client_id")   or "").strip()
    title       = (data.get("title")        or "").strip()
    matter_type = (data.get("matter_type")  or "").strip()
    if not client_id or not title or not matter_type:
        return jsonify({"error": "Client, title, and matter type are required"}), 400
    matter = create_matter(
        org_id=session.get("org") or "",
        client_id=client_id,
        title=title,
        matter_type=matter_type,
        status=data.get("status", "Active"),
        court_name=data.get("court_name") or None,
        case_number=data.get("case_number") or None,
        filing_date=data.get("filing_date") or None,
        opposing_party=data.get("opposing_party") or None,
        team_id=data.get("team_id") or None,
        notes=data.get("notes") or None,
        actor=session.get("user_id") or SYSTEM,
    )
    _audit(session, "matter_create",
           resource_type="matter", resource_id=matter["matter_id"], resource_name=title,
           details={"matter_type": matter_type, "status": data.get("status", "Active")})
    return jsonify(matter), 201


@bp.route("/matters/<matter_id>", methods=["GET"])
async def get_matter_detail(matter_id: str):
    session = _get_session()
    if not session:
        return jsonify({"error": "Unauthorized"}), 401
    matter = get_matter_with_docs(matter_id, session.get("org") or "")
    if not matter:
        return jsonify({"error": "Not found"}), 404
    return jsonify(matter)


@bp.route("/matters/<matter_id>", methods=["PATCH"])
async def edit_matter(matter_id: str):
    session = _get_session()
    if not session or session.get("role") != "org_owner":
        return jsonify({"error": "Unauthorized"}), 401
    data = await request.get_json(silent=True) or {}
    # Normalize empty strings to None for nullable fields
    for k in ("court_name", "case_number", "filing_date", "opposing_party", "team_id", "notes"):
        if k in data and data[k] == "":
            data[k] = None
    updated = update_matter(
        matter_id, session.get("org") or "",
        actor=session.get("user_id") or SYSTEM,
        **data,
    )
    if not updated:
        return jsonify({"error": "Not found"}), 404
    _audit(session, "matter_update",
           resource_type="matter", resource_id=matter_id,
           resource_name=(updated or {}).get("title"),
           details={"status": data.get("status")})
    return jsonify(updated)


@bp.route("/matters/<matter_id>", methods=["DELETE"])
async def remove_matter(matter_id: str):
    session = _get_session()
    if not session or session.get("role") != "org_owner":
        return jsonify({"error": "Unauthorized"}), 401
    delete_matter(matter_id, session.get("org") or "",
                  actor=session.get("user_id") or SYSTEM)
    _audit(session, "matter_delete", resource_type="matter", resource_id=matter_id)
    return jsonify({"success": True})


@bp.route("/matters/<matter_id>/documents/<doc_id>", methods=["POST"])
async def link_doc_to_matter(matter_id: str, doc_id: str):
    session = _get_session()
    if not session or session.get("role") != "org_owner":
        return jsonify({"error": "Unauthorized"}), 401
    ok = link_document_to_matter(doc_id, matter_id, session.get("org") or "",
                                 actor=session.get("user_id") or SYSTEM)
    if not ok:
        return jsonify({"error": "Document not found"}), 404
    return jsonify({"success": True})


@bp.route("/matters/<matter_id>/documents/<doc_id>", methods=["DELETE"])
async def unlink_doc_from_matter(matter_id: str, doc_id: str):
    session = _get_session()
    if not session or session.get("role") != "org_owner":
        return jsonify({"error": "Unauthorized"}), 401
    unlink_document_from_matter(doc_id, session.get("org") or "",
                                actor=session.get("user_id") or SYSTEM)
    return jsonify({"success": True})


# ─── PROJECT EASE: Plan & Upgrade API ───────────────────────────────────────

# Bank transfer details — fill these in .env before going live (see PLACEHOLDERS.md)
_BANK_NAME    = __import__("os").getenv("BANK_NAME",    "Your Bank Name")
_BANK_ACCOUNT = __import__("os").getenv("BANK_ACCOUNT", "0000-0000-0000-0000")
_BANK_IBAN    = __import__("os").getenv("BANK_IBAN",    "PK00XXXX0000000000000000")
_BANK_TITLE   = __import__("os").getenv("BANK_TITLE",   "Project Ease Pvt Ltd")
_SUPPORT_WA   = __import__("os").getenv("SUPPORT_WHATSAPP", "+92-300-0000000")


@bp.route("/plan-config", methods=["GET"])
async def get_plan_config():
    """Return plan limits and pricing for the frontend."""
    session = _get_session()
    if not session:
        return jsonify({"error": "Unauthorized"}), 401
    org    = get_org(session.get("org") or "")
    plan   = (org or {}).get("plan", "trial")
    return jsonify({
        "plans":        PLAN_CONFIG,
        "current_plan": plan,
        "bank": {
            "name":    _BANK_NAME,
            "account": _BANK_ACCOUNT,
            "iban":    _BANK_IBAN,
            "title":   _BANK_TITLE,
        },
        "support_whatsapp": _SUPPORT_WA,
    })


@bp.route("/upgrade-request", methods=["POST"])
async def submit_upgrade_request():
    """Owner submits an upgrade request after making a bank transfer."""
    session = _get_session()
    if not session or session.get("role") != "org_owner":
        return jsonify({"error": "Unauthorized"}), 401

    data           = await request.get_json(silent=True) or {}
    requested_plan = (data.get("requested_plan") or "").strip().lower()
    payment_ref    = (data.get("payment_ref") or "").strip() or None
    notes          = (data.get("notes") or "").strip() or None

    if requested_plan not in PLAN_CONFIG:
        return jsonify({"error": "Invalid plan"}), 400

    org = get_org(session.get("org") or "")
    if not org:
        return jsonify({"error": "Organization not found"}), 404

    current_plan = org.get("plan", "trial")
    if requested_plan == current_plan:
        return jsonify({"error": "You are already on this plan"}), 400

    req = create_upgrade_request(
        org_id        = org["org_id"],
        current_plan  = current_plan,
        requested_plan= requested_plan,
        payment_ref   = payment_ref,
        notes         = notes,
    )
    _audit(session, "upgrade_request",
           resource_type="plan", resource_name=requested_plan,
           details={"from": current_plan, "to": requested_plan, "payment_ref": payment_ref})

    # Fire-and-forget acknowledgement email
    try:
        import asyncio as _asyncio
        from email_helper import send_upgrade_request_received as _send_ack
        owner = next(
            (u for u in get_users_for_org(org["org_id"]) if u["role"] == "org_owner"),
            None
        )
        if owner:
            await _asyncio.to_thread(_send_ack, owner["email"], org["name"], requested_plan)
    except Exception:
        pass

    return jsonify(req), 201


@bp.route("/admin/upgrade-requests", methods=["GET"])
async def admin_list_upgrade_requests():
    err = _require_platform_admin()
    if err:
        return err
    status = request.args.get("status") or None
    return jsonify({"requests": get_upgrade_requests(status=status)})


@bp.route("/admin/upgrade-requests/<request_id>/approve", methods=["PATCH"])
async def admin_approve_upgrade(request_id: str):
    import asyncio as _asyncio
    err = _require_platform_admin()
    if err:
        return err
    admin_session = _get_session()
    resolver = (admin_session or {}).get("email") or SYSTEM

    result = resolve_upgrade_request(request_id, "approved", resolver)
    if not result:
        return jsonify({"error": "Request not found"}), 404

    # Fire-and-forget approval email
    try:
        from email_helper import send_upgrade_approved as _send_upgrade
        org = get_org(result["org_id"])
        if org:
            owner = next(
                (u for u in get_users_for_org(result["org_id"]) if u["role"] == "org_owner"),
                None
            )
            if owner:
                await _asyncio.to_thread(
                    _send_upgrade, owner["email"], org["name"], result["requested_plan"]
                )
    except Exception:
        pass

    log_event("upgrade_approved", org_id=result["org_id"],
              actor_name=resolver, details={"plan": result["requested_plan"]})
    return jsonify(result)


@bp.route("/admin/upgrade-requests/<request_id>/reject", methods=["PATCH"])
async def admin_reject_upgrade(request_id: str):
    err = _require_platform_admin()
    if err:
        return err
    admin_session = _get_session()
    resolver = (admin_session or {}).get("email") or SYSTEM

    result = resolve_upgrade_request(request_id, "rejected", resolver)
    if not result:
        return jsonify({"error": "Request not found"}), 404

    log_event("upgrade_rejected", org_id=result["org_id"],
              actor_name=resolver, details={"plan": result["requested_plan"]})
    return jsonify(result)


# ─── PROJECT EASE: Audit Log API ─────────────────────────────────────────────

@bp.route("/audit-logs", methods=["GET"])
async def list_audit_logs():
    """Return paginated audit logs scoped to the caller's org (owner) or all orgs (admin)."""
    session = _get_session()
    if not session:
        return jsonify({"error": "Unauthorized"}), 401

    role = session.get("role")
    if role not in ("org_owner", "platform_admin"):
        # Log the access attempt and reject
        _audit(session, "access_denied",
               details={"route": "/audit-logs", "reason": "insufficient_role"})
        return jsonify({"error": "Forbidden"}), 403

    # Platform admins can query across all orgs; org_owners are always scoped to their own
    org_id = None if role == "platform_admin" else session.get("org")
    # Admin may optionally filter by org
    if role == "platform_admin":
        org_id = request.args.get("org_id") or None

    event_type = request.args.get("event_type") or None
    user_id    = request.args.get("user_id")    or None
    date_from  = request.args.get("date_from")  or None
    date_to    = request.args.get("date_to")    or None
    limit      = min(int(request.args.get("limit",  "200")), 500)
    offset     = int(request.args.get("offset", "0"))

    logs  = get_audit_logs(org_id=org_id, event_type=event_type, user_id=user_id,
                           date_from=date_from, date_to=date_to, limit=limit, offset=offset)
    total = count_audit_logs(org_id=org_id, event_type=event_type, user_id=user_id,
                             date_from=date_from, date_to=date_to)
    return jsonify({"logs": logs, "total": total, "limit": limit, "offset": offset})


# ─── PROJECT EASE: Fees & Invoices API ───────────────────────────────────────


@bp.route("/fees", methods=["GET"])
async def list_fees():
    session = _get_session()
    if not session:
        return jsonify({"error": "Unauthorized"}), 401
    org_id    = session.get("org") or ""
    matter_id = request.args.get("matter_id") or None
    return jsonify(get_fees(org_id, matter_id=matter_id))


@bp.route("/fees", methods=["POST"])
async def add_fee():
    session = _get_session()
    if not session or session.get("role") not in ("org_owner", "employee"):
        return jsonify({"error": "Unauthorized"}), 401
    data        = await request.get_json(silent=True) or {}
    description = (data.get("description") or "").strip()
    fee_date    = (data.get("fee_date") or "").strip()
    amount      = int(data.get("amount") or 0)
    if not description or not fee_date:
        return jsonify({"error": "description and fee_date are required"}), 400
    if amount < 0:
        return jsonify({"error": "amount must be non-negative"}), 400
    org_id = session.get("org") or ""
    actor  = session.get("user_id") or SYSTEM
    f = create_fee(
        org_id=org_id, description=description, fee_date=fee_date, amount=amount,
        matter_id = data.get("matter_id") or None,
        fee_type  = data.get("fee_type")  or "Consultation",
        notes     = data.get("notes")     or None,
        actor=actor,
    )
    _audit(session, "fee_create",
           resource_type="fee", resource_name=description,
           details={"amount": amount, "matter_id": data.get("matter_id")})
    return jsonify(f), 201


@bp.route("/fees/<fee_id>", methods=["PATCH"])
async def edit_fee(fee_id: str):
    session = _get_session()
    if not session or session.get("role") not in ("org_owner", "employee"):
        return jsonify({"error": "Unauthorized"}), 401
    f = get_fee(fee_id)
    if not f or f.get("org_id") != session.get("org"):
        return jsonify({"error": "Not found"}), 404
    data  = await request.get_json(silent=True) or {}
    actor = session.get("user_id") or SYSTEM
    # Coerce amount to int if present
    if "amount" in data:
        data["amount"] = int(data["amount"] or 0)
    # Auto-set paid_at when marking paid
    if data.get("is_paid") and not f.get("paid_at"):
        import datetime as _dt
        data["paid_at"] = _dt.datetime.utcnow().strftime("%Y-%m-%d")
    updated = update_fee(fee_id, session.get("org") or "", actor=actor, **data)
    return jsonify(updated)


@bp.route("/fees/<fee_id>", methods=["DELETE"])
async def remove_fee(fee_id: str):
    session = _get_session()
    if not session or session.get("role") not in ("org_owner", "employee"):
        return jsonify({"error": "Unauthorized"}), 401
    f = get_fee(fee_id)
    if not f or f.get("org_id") != session.get("org"):
        return jsonify({"error": "Not found"}), 404
    actor = session.get("user_id") or SYSTEM
    delete_fee(fee_id, session.get("org") or "", actor=actor)
    return jsonify({"ok": True})


@bp.route("/invoices", methods=["GET"])
async def list_invoices():
    session = _get_session()
    if not session:
        return jsonify({"error": "Unauthorized"}), 401
    org_id    = session.get("org") or ""
    matter_id = request.args.get("matter_id") or None
    return jsonify(get_invoices(org_id, matter_id=matter_id))


@bp.route("/invoices", methods=["POST"])
async def add_invoice():
    session = _get_session()
    if not session or session.get("role") not in ("org_owner", "employee"):
        return jsonify({"error": "Unauthorized"}), 401
    data      = await request.get_json(silent=True) or {}
    matter_id = (data.get("matter_id") or "").strip()
    title     = (data.get("title") or "").strip()
    if not matter_id or not title:
        return jsonify({"error": "matter_id and title are required"}), 400
    import datetime as _dt
    org_id      = session.get("org") or ""
    actor       = session.get("user_id") or SYSTEM
    issued_date = data.get("issued_date") or _dt.datetime.utcnow().strftime("%Y-%m-%d")
    inv = create_invoice(
        org_id=org_id, matter_id=matter_id, title=title, issued_date=issued_date,
        client_id = data.get("client_id") or None,
        due_date  = data.get("due_date")  or None,
        notes     = data.get("notes")     or None,
        actor=actor,
    )
    _audit(session, "invoice_create",
           resource_type="invoice", resource_name=title,
           details={"matter_id": matter_id, "total": inv.get("total_amount")})
    return jsonify(inv), 201


@bp.route("/invoices/<invoice_id>", methods=["GET"])
async def get_invoice(invoice_id: str):
    session = _get_session()
    if not session:
        return jsonify({"error": "Unauthorized"}), 401
    inv = get_invoice_with_fees(invoice_id)
    if not inv or inv.get("org_id") != session.get("org"):
        return jsonify({"error": "Not found"}), 404
    return jsonify(inv)


@bp.route("/invoices/<invoice_id>", methods=["PATCH"])
async def edit_invoice(invoice_id: str):
    session = _get_session()
    if not session or session.get("role") not in ("org_owner", "employee"):
        return jsonify({"error": "Unauthorized"}), 401
    inv = get_invoice_with_fees(invoice_id)
    if not inv or inv.get("org_id") != session.get("org"):
        return jsonify({"error": "Not found"}), 404
    data  = await request.get_json(silent=True) or {}
    actor = session.get("user_id") or SYSTEM
    updated = update_invoice(invoice_id, session.get("org") or "", actor=actor, **data)
    return jsonify(updated)


# ─── PROJECT EASE: Court Calendar API ───────────────────────────────────────


@bp.route("/hearings", methods=["GET"])
async def list_hearings():
    session = _get_session()
    if not session:
        return jsonify({"error": "Unauthorized"}), 401
    org_id    = session.get("org") or ""
    from_date = request.args.get("from_date") or None
    to_date   = request.args.get("to_date")   or None
    return jsonify(get_hearings(org_id, from_date=from_date, to_date=to_date))


@bp.route("/hearings", methods=["POST"])
async def add_hearing():
    session = _get_session()
    if not session or session.get("role") not in ("org_owner", "employee"):
        return jsonify({"error": "Unauthorized"}), 401
    data = await request.get_json(silent=True) or {}
    title        = (data.get("title") or "").strip()
    hearing_date = (data.get("hearing_date") or "").strip()
    if not title or not hearing_date:
        return jsonify({"error": "title and hearing_date are required"}), 400
    org_id = session.get("org") or ""
    actor  = session.get("user_id") or SYSTEM
    h = create_hearing(
        org_id=org_id, title=title, hearing_date=hearing_date,
        matter_id   = data.get("matter_id")    or None,
        hearing_time= data.get("hearing_time") or None,
        court_name  = data.get("court_name")   or None,
        judge_name  = data.get("judge_name")   or None,
        notes       = data.get("notes")        or None,
        wa_reminder = bool(data.get("wa_reminder", False)),
        actor=actor,
    )
    _audit(session, "hearing_create",
           resource_type="hearing", resource_name=title,
           details={"date": hearing_date, "matter_id": data.get("matter_id")})
    return jsonify(h), 201


@bp.route("/hearings/<hearing_id>", methods=["GET"])
async def get_hearing_detail(hearing_id: str):
    session = _get_session()
    if not session:
        return jsonify({"error": "Unauthorized"}), 401
    h = get_hearing(hearing_id)
    if not h or h.get("org_id") != session.get("org"):
        return jsonify({"error": "Not found"}), 404
    return jsonify(h)


@bp.route("/hearings/<hearing_id>", methods=["PATCH"])
async def edit_hearing(hearing_id: str):
    session = _get_session()
    if not session or session.get("role") not in ("org_owner", "employee"):
        return jsonify({"error": "Unauthorized"}), 401
    h = get_hearing(hearing_id)
    if not h or h.get("org_id") != session.get("org"):
        return jsonify({"error": "Not found"}), 404
    data  = await request.get_json(silent=True) or {}
    actor = session.get("user_id") or SYSTEM
    updated = update_hearing(hearing_id, session.get("org") or "", actor=actor, **data)
    return jsonify(updated)


@bp.route("/hearings/<hearing_id>", methods=["DELETE"])
async def remove_hearing(hearing_id: str):
    session = _get_session()
    if not session or session.get("role") not in ("org_owner", "employee"):
        return jsonify({"error": "Unauthorized"}), 401
    h = get_hearing(hearing_id)
    if not h or h.get("org_id") != session.get("org"):
        return jsonify({"error": "Not found"}), 404
    actor = session.get("user_id") or SYSTEM
    delete_hearing(hearing_id, session.get("org") or "", actor=actor)
    _audit(session, "hearing_delete", resource_type="hearing", resource_name=h.get("title", ""))
    return jsonify({"ok": True})


@bp.route("/deadlines", methods=["GET"])
async def list_deadlines():
    session = _get_session()
    if not session:
        return jsonify({"error": "Unauthorized"}), 401
    org_id    = session.get("org") or ""
    from_date = request.args.get("from_date") or None
    to_date   = request.args.get("to_date")   or None
    return jsonify(get_deadlines(org_id, from_date=from_date, to_date=to_date))


@bp.route("/deadlines", methods=["POST"])
async def add_deadline():
    session = _get_session()
    if not session or session.get("role") not in ("org_owner", "employee"):
        return jsonify({"error": "Unauthorized"}), 401
    data = await request.get_json(silent=True) or {}
    title    = (data.get("title") or "").strip()
    due_date = (data.get("due_date") or "").strip()
    if not title or not due_date:
        return jsonify({"error": "title and due_date are required"}), 400
    org_id = session.get("org") or ""
    actor  = session.get("user_id") or SYSTEM
    d = create_deadline(
        org_id=org_id, title=title, due_date=due_date,
        matter_id     = data.get("matter_id")      or None,
        deadline_type = data.get("deadline_type")  or "Filing",
        notes         = data.get("notes")          or None,
        wa_reminder   = bool(data.get("wa_reminder", False)),
        actor=actor,
    )
    _audit(session, "deadline_create",
           resource_type="deadline", resource_name=title,
           details={"due_date": due_date, "matter_id": data.get("matter_id")})
    return jsonify(d), 201


@bp.route("/deadlines/<deadline_id>", methods=["PATCH"])
async def edit_deadline(deadline_id: str):
    session = _get_session()
    if not session or session.get("role") not in ("org_owner", "employee"):
        return jsonify({"error": "Unauthorized"}), 401
    d = get_deadline(deadline_id)
    if not d or d.get("org_id") != session.get("org"):
        return jsonify({"error": "Not found"}), 404
    data  = await request.get_json(silent=True) or {}
    actor = session.get("user_id") or SYSTEM
    updated = update_deadline(deadline_id, session.get("org") or "", actor=actor, **data)
    return jsonify(updated)


@bp.route("/deadlines/<deadline_id>", methods=["DELETE"])
async def remove_deadline(deadline_id: str):
    session = _get_session()
    if not session or session.get("role") not in ("org_owner", "employee"):
        return jsonify({"error": "Unauthorized"}), 401
    d = get_deadline(deadline_id)
    if not d or d.get("org_id") != session.get("org"):
        return jsonify({"error": "Not found"}), 404
    actor = session.get("user_id") or SYSTEM
    delete_deadline(deadline_id, session.get("org") or "", actor=actor)
    _audit(session, "deadline_delete", resource_type="deadline", resource_name=d.get("title", ""))
    return jsonify({"ok": True})


# ─── Case Law (PLD / SCMR / MLD / CLC) — Task #33 ──────────────────────────
# Documents are indexed into Azure Search with category="__case_law__" so they
# are visible to every authenticated user alongside their own org's documents.
# Only the platform admin can upload / delete case law documents.

CASE_LAW_CATEGORY = "__case_law__"

VALID_PUBLISHERS = {"PLD", "SCMR", "MLD", "CLC", "OTHER"}


@bp.route("/admin/case-law", methods=["GET"])
async def admin_list_case_law():
    session = _get_session()
    if not session or session.get("role") != "platform_admin":
        return jsonify({"error": "Unauthorized"}), 401
    publisher = request.args.get("publisher")
    docs = list_case_law_docs(publisher or None)
    return jsonify({"docs": docs})


@bp.route("/admin/case-law/upload", methods=["POST"])
async def admin_upload_case_law():
    """Admin uploads a PLD/SCMR/MLD/CLC PDF to the shared case law index."""
    session = _get_session()
    if not session or session.get("role") != "platform_admin":
        return jsonify({"error": "Unauthorized"}), 401

    files = await request.files
    form  = await request.form
    if "file" not in files:
        return jsonify({"error": "No file provided"}), 400

    uploaded_file = files["file"]
    filename: str = uploaded_file.filename or "upload"

    import os as _os
    ext = _os.path.splitext(filename)[1].lower()
    if ext != ".pdf":
        return jsonify({"error": "Only PDF files are supported for case law."}), 400

    publisher = (form.get("publisher") or "OTHER").upper()
    if publisher not in VALID_PUBLISHERS:
        publisher = "OTHER"
    title  = (form.get("title") or filename).strip()
    year_s = form.get("year") or ""
    volume = (form.get("volume") or "").strip() or None
    court  = (form.get("court")  or "").strip() or None

    try:
        year = int(year_s) if year_s.strip().isdigit() else None
    except ValueError:
        year = None

    actor = session.get("user_id") or SYSTEM

    try:
        import tempfile, asyncio as _asyncio
        from dotenv import load_dotenv as _ld
        _ld(dotenv_path=_os.path.join(_os.path.dirname(__file__), ".env"), override=True)

        from azure.core.credentials import AzureKeyCredential as _AKC
        from azure.identity.aio import AzureDeveloperCliCredential as _AzCred
        from prepdocslib.servicesetup import (
            OpenAIHost, setup_search_info, setup_blob_manager,
            setup_embeddings_service, setup_openai_client,
            build_file_processors,
        )
        from prepdocslib.listfilestrategy import LocalListFileStrategy
        from prepdocslib.filestrategy import FileStrategy
        from prepdocslib.strategy import DocumentAction

        azure_credential = _AzCred(process_timeout=60)
        OPENAI_HOST = OpenAIHost(_os.environ["OPENAI_HOST"])

        search_key = _os.getenv("AZURE_SEARCH_KEY")
        search_info = setup_search_info(
            search_service=_os.environ["AZURE_SEARCH_SERVICE"],
            index_name=_os.environ["AZURE_SEARCH_INDEX"],
            azure_credential=azure_credential,
            search_key=search_key,
        )

        blob_manager = setup_blob_manager(
            azure_credential=azure_credential,
            storage_account=_os.environ["AZURE_STORAGE_ACCOUNT"],
            storage_container=_os.environ["AZURE_STORAGE_CONTAINER"],
            storage_resource_group=_os.environ.get("AZURE_STORAGE_RESOURCE_GROUP"),
            subscription_id=_os.environ.get("AZURE_SUBSCRIPTION_ID"),
            storage_key=_os.getenv("AZURE_STORAGE_KEY"),
        )

        openai_client, azure_openai_endpoint = setup_openai_client(
            openai_host=OPENAI_HOST,
            azure_credential=azure_credential,
            azure_openai_service=_os.getenv("AZURE_OPENAI_SERVICE"),
            azure_openai_api_key=_os.getenv("AZURE_OPENAI_API_KEY_OVERRIDE"),
        )

        doc_int_service = _os.getenv("AZURE_DOCUMENTINTELLIGENCE_SERVICE")
        doc_int_key = _os.getenv("AZURE_DOCUMENTINTELLIGENCE_KEY")
        file_processors, figure_processor = build_file_processors(
            azure_credential=azure_credential,
            document_intelligence_service=doc_int_service,
            document_intelligence_key=doc_int_key if doc_int_key and doc_int_key != "YOUR_DOC_INTELLIGENCE_KEY_HERE" else None,
            use_local_pdf_parser=not doc_int_service,
            use_local_html_parser=not doc_int_service,
        ), None
        if isinstance(file_processors, tuple):
            file_processors, figure_processor = file_processors

        embeddings_service = setup_embeddings_service(
            OPENAI_HOST, openai_client,
            emb_model_name=_os.environ["AZURE_OPENAI_EMB_MODEL_NAME"],
            emb_model_dimensions=int(_os.getenv("AZURE_OPENAI_EMB_DIMENSIONS", "1536")),
            azure_openai_deployment=_os.getenv("AZURE_OPENAI_EMB_DEPLOYMENT"),
            azure_openai_endpoint=azure_openai_endpoint,
        )

        file_bytes = uploaded_file.read()
        size_bytes = len(file_bytes)
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name

        # Create DB record
        doc_record = create_case_law_doc(
            publisher=publisher, title=title,
            filename=filename, size_bytes=size_bytes,
            year=year, volume=volume, court=court,
            actor=actor,
        )
        doc_id = doc_record["doc_id"]

        async def _index_case_law():
            try:
                list_strategy = LocalListFileStrategy(path_pattern=tmp_path)
                strategy = FileStrategy(
                    search_info=search_info,
                    list_file_strategy=list_strategy,
                    blob_manager=blob_manager,
                    file_processors=file_processors,
                    document_action=DocumentAction.Add,
                    embeddings=embeddings_service,
                    image_embeddings=None,
                    search_field_name_embedding=_os.getenv("AZURE_SEARCH_FIELD_NAME_EMBEDDING", "embedding"),
                    use_acls=False,
                    category=CASE_LAW_CATEGORY,   # ← shared pool, NOT org_id
                    figure_processor=figure_processor,
                )
                await strategy.setup()
                await strategy.run()
                set_case_law_doc_status(doc_id, "ready", actor=actor)
            except Exception as exc:
                set_case_law_doc_status(doc_id, "error", error_msg=str(exc), actor=actor)
                logging.getLogger(__name__).error("Case law indexing failed: %s", exc)
            finally:
                try:
                    _os.remove(tmp_path)
                    md5 = tmp_path + ".md5"
                    if _os.path.exists(md5):
                        _os.remove(md5)
                except Exception:
                    pass

        _asyncio.ensure_future(_index_case_law())
        _audit(session, "case_law_upload", resource_type="case_law_doc",
               resource_name=title, resource_id=doc_id)
        return jsonify({"doc": doc_record, "message": "Indexing started. Status will update to 'ready' when complete."})

    except Exception as exc:
        logging.getLogger(__name__).error("Case law upload error: %s", exc)
        return jsonify({"error": f"Upload failed: {exc}"}), 500


@bp.route("/admin/case-law/<doc_id>", methods=["DELETE"])
async def admin_delete_case_law(doc_id: str):
    session = _get_session()
    if not session or session.get("role") != "platform_admin":
        return jsonify({"error": "Unauthorized"}), 401
    doc = get_case_law_doc(doc_id)
    if not doc:
        return jsonify({"error": "Not found"}), 404
    actor = session.get("user_id") or SYSTEM
    delete_case_law_doc(doc_id, actor=actor)
    _audit(session, "case_law_delete", resource_type="case_law_doc",
           resource_name=doc.get("title", ""), resource_id=doc_id)
    # Note: blob + search index cleanup left to admin manually for now
    # (or add a separate cleanup job — see PLACEHOLDERS.md)
    return jsonify({"ok": True})


# ─── WhatsApp reminder scheduler (runs hourly in background) ─────────────────

_scheduler_started = False


def _start_reminder_scheduler(app_ref):
    """Start APScheduler to send WhatsApp reminders once per hour."""
    global _scheduler_started
    if _scheduler_started:
        return
    try:
        from apscheduler.schedulers.background import BackgroundScheduler  # type: ignore
        scheduler = BackgroundScheduler(daemon=True)
        scheduler.add_job(_send_due_reminders, "interval", hours=1, id="wa_reminders")
        scheduler.start()
        _scheduler_started = True
        logging.getLogger(__name__).info("WhatsApp reminder scheduler started.")
    except ImportError:
        logging.getLogger(__name__).warning(
            "apscheduler not installed — WhatsApp reminders disabled. "
            "Run: pip install apscheduler"
        )


def _send_due_reminders():
    """Fire-and-forget: send WhatsApp reminders for hearings/deadlines due tomorrow."""
    import asyncio as _aio
    try:
        loop = _aio.new_event_loop()
        loop.run_until_complete(_send_due_reminders_async())
    except Exception as exc:
        logging.getLogger(__name__).error("Reminder scheduler error: %s", exc)


async def _send_due_reminders_async():
    from whatsapp_helper import send_whatsapp_text  # type: ignore[import]

    # Hearings
    for h in get_hearings_needing_reminder():
        wa = h.get("owner_wa")
        if not wa:
            continue
        time_str = f" at {h['hearing_time']}" if h.get("hearing_time") else ""
        msg = (
            f"🏛️ *Project Ease Reminder*\n\n"
            f"*Hearing tomorrow{time_str}*\n"
            f"📌 {h['title']}\n"
            f"🗓️ {h['hearing_date']}\n"
            + (f"🏛️ {h['court_name']}\n" if h.get("court_name") else "")
            + (f"⚖️ {h['matter_title']}\n" if h.get("matter_title") else "")
            + "\n_Sent by Project Ease_"
        )
        try:
            import asyncio as _aio
            await _aio.to_thread(send_whatsapp_text, wa, msg)
            mark_hearing_reminder_sent(h["hearing_id"])
        except Exception as exc:
            logging.getLogger(__name__).error("Hearing reminder send error: %s", exc)

    # Deadlines
    for d in get_deadlines_needing_reminder():
        wa = d.get("owner_wa")
        if not wa:
            continue
        msg = (
            f"⚠️ *Project Ease Reminder*\n\n"
            f"*Deadline tomorrow*\n"
            f"📌 {d['title']}\n"
            f"🗓️ {d['due_date']} · {d.get('deadline_type', 'Filing')}\n"
            + (f"⚖️ {d['matter_title']}\n" if d.get("matter_title") else "")
            + "\n_Sent by Project Ease_"
        )
        try:
            import asyncio as _aio
            await _aio.to_thread(send_whatsapp_text, wa, msg)
            mark_deadline_reminder_sent(d["deadline_id"])
        except Exception as exc:
            logging.getLogger(__name__).error("Deadline reminder send error: %s", exc)


# ─── Answer Export (PDF via browser print / Word via python-docx) ─────────────

@bp.route("/export/answer", methods=["POST"])
async def export_answer():
    """Generate a .docx file from an AI answer and return it for download.

    Request JSON:
        question  : str   – the user's question
        answer    : str   – the AI's answer text
        citations : list  – list of citation strings (filenames / doc titles)
        org_name  : str   – firm name for header branding
    """
    session = _get_session()
    if not session:
        return jsonify({"error": "Unauthorized"}), 401

    try:
        from docx import Document as _DocxDocument  # type: ignore[import]
        from docx.shared import Pt, RGBColor, Inches  # type: ignore[import]
        from docx.enum.text import WD_ALIGN_PARAGRAPH  # type: ignore[import]
    except ImportError:
        return jsonify({"error": "python-docx not installed. Run: pip install python-docx"}), 503

    body = await request.get_json(force=True) or {}
    question  = (body.get("question")  or "").strip()
    answer    = (body.get("answer")    or "").strip()
    citations = [str(c) for c in (body.get("citations") or [])]
    org_name  = (body.get("org_name")  or "Project Ease").strip()

    if not answer:
        return jsonify({"error": "answer is required"}), 400

    doc = _DocxDocument()

    # ── Page margins ──────────────────────────────────────────────────────────
    for section in doc.sections:
        section.top_margin    = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin   = Inches(1.25)
        section.right_margin  = Inches(1.25)

    # ── Brand header ──────────────────────────────────────────────────────────
    header_para = doc.add_paragraph()
    header_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = header_para.add_run(org_name)
    run.bold = True
    run.font.size = Pt(16)
    run.font.color.rgb = RGBColor(0xB8, 0x96, 0x4C)  # --gold

    sub_para = doc.add_paragraph()
    sub_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    sub_run = sub_para.add_run("AI Research Export — Project Ease")
    sub_run.font.size = Pt(9)
    sub_run.font.color.rgb = RGBColor(0x88, 0x88, 0x88)

    import datetime as _dt
    date_str = _dt.datetime.now().strftime("%-d %B %Y")
    date_para = doc.add_paragraph()
    date_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    date_run = date_para.add_run(date_str)
    date_run.font.size = Pt(9)
    date_run.font.color.rgb = RGBColor(0x88, 0x88, 0x88)

    doc.add_paragraph()  # spacer

    # ── Question ──────────────────────────────────────────────────────────────
    if question:
        q_label = doc.add_paragraph()
        q_label_run = q_label.add_run("Question")
        q_label_run.bold = True
        q_label_run.font.size = Pt(10)
        q_label_run.font.color.rgb = RGBColor(0xB8, 0x96, 0x4C)

        q_para = doc.add_paragraph()
        q_para.paragraph_format.left_indent = Inches(0.25)
        q_run = q_para.add_run(question)
        q_run.font.size = Pt(11)
        q_run.italic = True

        doc.add_paragraph()  # spacer

    # ── Answer ────────────────────────────────────────────────────────────────
    a_label = doc.add_paragraph()
    a_label_run = a_label.add_run("Answer")
    a_label_run.bold = True
    a_label_run.font.size = Pt(10)
    a_label_run.font.color.rgb = RGBColor(0xB8, 0x96, 0x4C)

    # Split answer into paragraphs so line breaks render correctly
    for para_text in answer.split("\n"):
        if para_text.strip():
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Inches(0.25)
            p.paragraph_format.space_after = Pt(4)
            run_a = p.add_run(para_text)
            run_a.font.size = Pt(11)

    # ── Citations ─────────────────────────────────────────────────────────────
    if citations:
        doc.add_paragraph()  # spacer
        c_label = doc.add_paragraph()
        c_label_run = c_label.add_run("Sources")
        c_label_run.bold = True
        c_label_run.font.size = Pt(10)
        c_label_run.font.color.rgb = RGBColor(0xB8, 0x96, 0x4C)

        for i, citation in enumerate(citations, 1):
            c_para = doc.add_paragraph()
            c_para.paragraph_format.left_indent = Inches(0.25)
            c_run = c_para.add_run(f"{i}. {citation}")
            c_run.font.size = Pt(10)
            c_run.font.color.rgb = RGBColor(0x44, 0x44, 0x44)

    # ── Footer note ───────────────────────────────────────────────────────────
    doc.add_paragraph()
    footer_para = doc.add_paragraph()
    footer_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    footer_run = footer_para.add_run("Generated by Project Ease · AI answers should be verified by a qualified lawyer.")
    footer_run.font.size = Pt(8)
    footer_run.font.color.rgb = RGBColor(0xAA, 0xAA, 0xAA)
    footer_run.italic = True

    # ── Stream file ───────────────────────────────────────────────────────────
    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)

    import re as _re
    safe_q = _re.sub(r"[^\w\s-]", "", question[:40]).strip().replace(" ", "_") if question else "answer"
    filename = f"ProjectEase_Export_{safe_q}.docx"

    response = await make_response(buf.read())
    response.headers["Content-Type"]        = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    response.headers["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


@bp.before_app_serving
async def setup_clients():
    # Load .env — works whether entry point is main.py or quart --app app:create_app
    from dotenv import load_dotenv as _load_dotenv
    _load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"), override=True)

    # ── PROJECT EASE: graceful local-dev mode ──────────────────────────────────
    # When Azure credentials are not configured the app starts in auth-only mode.
    # /auth/* endpoints work; Azure-backed routes (/chat, /config, etc.) will
    # return 503 until real credentials are provided.
    if not os.environ.get("AZURE_STORAGE_ACCOUNT"):
        current_app.logger.warning(
            "AZURE_STORAGE_ACCOUNT not set — starting in auth-only mode. "
            "Chat and search features require Azure credentials."
        )
        current_app.config["AZURE_CONFIGURED"] = False
        return
    current_app.config["AZURE_CONFIGURED"] = True

    # Replace these with your own values, either in environment variables or directly here
    AZURE_STORAGE_ACCOUNT = os.environ["AZURE_STORAGE_ACCOUNT"]
    AZURE_STORAGE_CONTAINER = os.environ["AZURE_STORAGE_CONTAINER"]
    AZURE_IMAGESTORAGE_CONTAINER = os.environ.get("AZURE_IMAGESTORAGE_CONTAINER")
    AZURE_USERSTORAGE_ACCOUNT = os.environ.get("AZURE_USERSTORAGE_ACCOUNT")
    AZURE_USERSTORAGE_CONTAINER = os.environ.get("AZURE_USERSTORAGE_CONTAINER")
    AZURE_SEARCH_SERVICE = os.environ["AZURE_SEARCH_SERVICE"]
    AZURE_SEARCH_ENDPOINT = f"https://{AZURE_SEARCH_SERVICE}.search.windows.net"
    AZURE_SEARCH_INDEX = os.environ["AZURE_SEARCH_INDEX"]
    AZURE_SEARCH_KNOWLEDGEBASE_NAME = os.getenv("AZURE_SEARCH_KNOWLEDGEBASE_NAME", "")
    # Shared by all OpenAI deployments
    OPENAI_HOST = OpenAIHost(os.getenv("OPENAI_HOST", "azure"))
    OPENAI_CHATGPT_MODEL = os.environ["AZURE_OPENAI_CHATGPT_MODEL"]
    AZURE_OPENAI_KNOWLEDGEBASE_MODEL = os.getenv("AZURE_OPENAI_KNOWLEDGEBASE_MODEL")
    AZURE_OPENAI_KNOWLEDGEBASE_DEPLOYMENT = os.getenv("AZURE_OPENAI_KNOWLEDGEBASE_DEPLOYMENT")
    OPENAI_EMB_MODEL = os.getenv("AZURE_OPENAI_EMB_MODEL_NAME", "text-embedding-ada-002")
    OPENAI_EMB_DIMENSIONS = int(os.getenv("AZURE_OPENAI_EMB_DIMENSIONS") or 1536)
    OPENAI_REASONING_EFFORT = os.getenv("AZURE_OPENAI_REASONING_EFFORT")
    # Used with Azure OpenAI deployments
    AZURE_OPENAI_SERVICE = os.getenv("AZURE_OPENAI_SERVICE")
    AZURE_OPENAI_CHATGPT_DEPLOYMENT = (
        os.getenv("AZURE_OPENAI_CHATGPT_DEPLOYMENT")
        if OPENAI_HOST in [OpenAIHost.AZURE, OpenAIHost.AZURE_CUSTOM]
        else None
    )
    AZURE_OPENAI_EMB_DEPLOYMENT = (
        os.getenv("AZURE_OPENAI_EMB_DEPLOYMENT") if OPENAI_HOST in [OpenAIHost.AZURE, OpenAIHost.AZURE_CUSTOM] else None
    )
    AZURE_OPENAI_CUSTOM_URL = os.getenv("AZURE_OPENAI_CUSTOM_URL")
    AZURE_VISION_ENDPOINT = os.getenv("AZURE_VISION_ENDPOINT", "")
    AZURE_OPENAI_API_KEY_OVERRIDE = os.getenv("AZURE_OPENAI_API_KEY_OVERRIDE")
    # Used only with non-Azure OpenAI deployments
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    OPENAI_ORGANIZATION = os.getenv("OPENAI_ORGANIZATION")

    AZURE_TENANT_ID = os.getenv("AZURE_TENANT_ID")
    AZURE_USE_AUTHENTICATION = os.getenv("AZURE_USE_AUTHENTICATION", "").lower() == "true"
    AZURE_ENFORCE_ACCESS_CONTROL = os.getenv("AZURE_ENFORCE_ACCESS_CONTROL", "").lower() == "true"
    AZURE_ENABLE_UNAUTHENTICATED_ACCESS = os.getenv("AZURE_ENABLE_UNAUTHENTICATED_ACCESS", "").lower() == "true"
    AZURE_SERVER_APP_ID = os.getenv("AZURE_SERVER_APP_ID")
    AZURE_SERVER_APP_SECRET = os.getenv("AZURE_SERVER_APP_SECRET")
    AZURE_CLIENT_APP_ID = os.getenv("AZURE_CLIENT_APP_ID")
    AZURE_AUTH_TENANT_ID = os.getenv("AZURE_AUTH_TENANT_ID", AZURE_TENANT_ID)

    KB_FIELDS_CONTENT = os.getenv("KB_FIELDS_CONTENT", "content")
    KB_FIELDS_SOURCEPAGE = os.getenv("KB_FIELDS_SOURCEPAGE", "sourcepage")

    AZURE_SEARCH_QUERY_LANGUAGE = os.getenv("AZURE_SEARCH_QUERY_LANGUAGE") or "en-us"
    AZURE_SEARCH_QUERY_SPELLER = os.getenv("AZURE_SEARCH_QUERY_SPELLER") or "lexicon"
    AZURE_SEARCH_SEMANTIC_RANKER = os.getenv("AZURE_SEARCH_SEMANTIC_RANKER", "free").lower()
    AZURE_SEARCH_QUERY_REWRITING = os.getenv("AZURE_SEARCH_QUERY_REWRITING", "false").lower()
    # This defaults to the previous field name "embedding", for backwards compatibility
    AZURE_SEARCH_FIELD_NAME_EMBEDDING = os.getenv("AZURE_SEARCH_FIELD_NAME_EMBEDDING", "embedding")

    AZURE_SPEECH_SERVICE_ID = os.getenv("AZURE_SPEECH_SERVICE_ID")
    AZURE_SPEECH_SERVICE_LOCATION = os.getenv("AZURE_SPEECH_SERVICE_LOCATION")
    AZURE_SPEECH_SERVICE_VOICE = os.getenv("AZURE_SPEECH_SERVICE_VOICE") or "en-US-AndrewMultilingualNeural"

    USE_MULTIMODAL = os.getenv("USE_MULTIMODAL", "").lower() == "true"
    RAG_SEARCH_TEXT_EMBEDDINGS = os.getenv("RAG_SEARCH_TEXT_EMBEDDINGS", "true").lower() == "true"
    RAG_SEARCH_IMAGE_EMBEDDINGS = os.getenv("RAG_SEARCH_IMAGE_EMBEDDINGS", "true").lower() == "true"
    RAG_SEND_TEXT_SOURCES = os.getenv("RAG_SEND_TEXT_SOURCES", "true").lower() == "true"
    RAG_SEND_IMAGE_SOURCES = os.getenv("RAG_SEND_IMAGE_SOURCES", "true").lower() == "true"
    USE_USER_UPLOAD = os.getenv("USE_USER_UPLOAD", "").lower() == "true"
    ENABLE_LANGUAGE_PICKER = os.getenv("ENABLE_LANGUAGE_PICKER", "").lower() == "true"
    USE_SPEECH_INPUT_BROWSER = os.getenv("USE_SPEECH_INPUT_BROWSER", "").lower() == "true"
    USE_SPEECH_OUTPUT_BROWSER = os.getenv("USE_SPEECH_OUTPUT_BROWSER", "").lower() == "true"
    USE_SPEECH_OUTPUT_AZURE = os.getenv("USE_SPEECH_OUTPUT_AZURE", "").lower() == "true"
    USE_CHAT_HISTORY_BROWSER = os.getenv("USE_CHAT_HISTORY_BROWSER", "").lower() == "true"
    USE_CHAT_HISTORY_COSMOS = os.getenv("USE_CHAT_HISTORY_COSMOS", "").lower() == "true"
    USE_AGENTIC_KNOWLEDGEBASE = os.getenv("USE_AGENTIC_KNOWLEDGEBASE", "").lower() == "true"
    USE_WEB_SOURCE = os.getenv("USE_WEB_SOURCE", "").lower() == "true"
    USE_SHAREPOINT_SOURCE = os.getenv("USE_SHAREPOINT_SOURCE", "").lower() == "true"
    AGENTIC_KNOWLEDGEBASE_REASONING_EFFORT = os.getenv("AGENTIC_KNOWLEDGEBASE_REASONING_EFFORT", "low")
    USE_VECTORS = os.getenv("USE_VECTORS", "").lower() != "false"

    if USE_SHAREPOINT_SOURCE and not AZURE_ENFORCE_ACCESS_CONTROL:
        current_app.logger.warning("AZURE_ENFORCE_ACCESS_CONTROL must be true when USE_SHAREPOINT_SOURCE is true")

    # WEBSITE_HOSTNAME is always set by App Service, RUNNING_IN_PRODUCTION is set in main.bicep
    RUNNING_ON_AZURE = os.getenv("WEBSITE_HOSTNAME") is not None or os.getenv("RUNNING_IN_PRODUCTION") is not None

    # Use the current user identity for keyless authentication to Azure services.
    # This assumes you use 'azd auth login' locally, and managed identity when deployed on Azure.
    # The managed identity is setup in the infra/ folder.
    azure_credential: AzureDeveloperCliCredential | ManagedIdentityCredential
    azure_ai_token_provider: Callable[[], Awaitable[str]]
    if RUNNING_ON_AZURE:
        current_app.logger.info("Setting up Azure credential using ManagedIdentityCredential")
        if AZURE_CLIENT_ID := os.getenv("AZURE_CLIENT_ID"):
            # ManagedIdentityCredential should use AZURE_CLIENT_ID if set in env, but its not working for some reason,
            # so we explicitly pass it in as the client ID here. This is necessary for user-assigned managed identities.
            current_app.logger.info(
                "Setting up Azure credential using ManagedIdentityCredential with client_id %s", AZURE_CLIENT_ID
            )
            azure_credential = ManagedIdentityCredential(client_id=AZURE_CLIENT_ID)
        else:
            current_app.logger.info("Setting up Azure credential using ManagedIdentityCredential")
            azure_credential = ManagedIdentityCredential()
    elif AZURE_TENANT_ID:
        current_app.logger.info(
            "Setting up Azure credential using AzureDeveloperCliCredential with tenant_id %s", AZURE_TENANT_ID
        )
        azure_credential = AzureDeveloperCliCredential(tenant_id=AZURE_TENANT_ID, process_timeout=60)
    else:
        current_app.logger.info("Setting up Azure credential using AzureDeveloperCliCredential for home tenant")
        azure_credential = AzureDeveloperCliCredential(process_timeout=60)
    azure_ai_token_provider = get_bearer_token_provider(
        azure_credential, "https://cognitiveservices.azure.com/.default"
    )

    # Set the Azure credential in the app config for use in other parts of the app
    current_app.config[CONFIG_CREDENTIAL] = azure_credential

    # Set up clients for AI Search and Storage
    AZURE_SEARCH_KEY = os.getenv("AZURE_SEARCH_KEY")
    search_credential = AzureKeyCredential(AZURE_SEARCH_KEY) if AZURE_SEARCH_KEY else azure_credential
    search_client = SearchClient(
        endpoint=AZURE_SEARCH_ENDPOINT,
        index_name=AZURE_SEARCH_INDEX,
        credential=search_credential,
    )

    knowledgebase_client = KnowledgeBaseRetrievalClient(
        endpoint=AZURE_SEARCH_ENDPOINT,
        knowledge_base_name=AZURE_SEARCH_KNOWLEDGEBASE_NAME,
        credential=azure_credential,
    )
    knowledgebase_client_with_web = None
    knowledgebase_client_with_sharepoint = None
    knowledgebase_client_with_web_and_sharepoint = None

    if AZURE_SEARCH_KNOWLEDGEBASE_NAME:
        if USE_WEB_SOURCE:
            knowledgebase_client_with_web = KnowledgeBaseRetrievalClient(
                endpoint=AZURE_SEARCH_ENDPOINT,
                knowledge_base_name=f"{AZURE_SEARCH_KNOWLEDGEBASE_NAME}-with-web",
                credential=azure_credential,
            )
        if USE_SHAREPOINT_SOURCE:
            knowledgebase_client_with_sharepoint = KnowledgeBaseRetrievalClient(
                endpoint=AZURE_SEARCH_ENDPOINT,
                knowledge_base_name=f"{AZURE_SEARCH_KNOWLEDGEBASE_NAME}-with-sp",
                credential=azure_credential,
            )
        if USE_WEB_SOURCE and USE_SHAREPOINT_SOURCE:
            knowledgebase_client_with_web_and_sharepoint = KnowledgeBaseRetrievalClient(
                endpoint=AZURE_SEARCH_ENDPOINT,
                knowledge_base_name=f"{AZURE_SEARCH_KNOWLEDGEBASE_NAME}-with-web-and-sp",
                credential=azure_credential,
            )

    # Set up the global blob storage manager (used for global content/images, but not user uploads)
    global_blob_manager = BlobManager(
        endpoint=f"https://{AZURE_STORAGE_ACCOUNT}.blob.core.windows.net",
        credential=azure_credential,
        container=AZURE_STORAGE_CONTAINER,
        image_container=AZURE_IMAGESTORAGE_CONTAINER,
    )
    current_app.config[CONFIG_GLOBAL_BLOB_MANAGER] = global_blob_manager

    # Set up authentication helper
    search_index = None
    if AZURE_USE_AUTHENTICATION:
        current_app.logger.info("AZURE_USE_AUTHENTICATION is true, setting up search index client")
        search_index_client = SearchIndexClient(
            endpoint=AZURE_SEARCH_ENDPOINT,
            credential=azure_credential,
        )
        search_index = await search_index_client.get_index(AZURE_SEARCH_INDEX)
        await search_index_client.close()
    auth_helper = AuthenticationHelper(
        search_index=search_index,
        use_authentication=AZURE_USE_AUTHENTICATION,
        server_app_id=AZURE_SERVER_APP_ID,
        server_app_secret=AZURE_SERVER_APP_SECRET,
        client_app_id=AZURE_CLIENT_APP_ID,
        tenant_id=AZURE_AUTH_TENANT_ID,
        enforce_access_control=AZURE_ENFORCE_ACCESS_CONTROL,
        enable_unauthenticated_access=AZURE_ENABLE_UNAUTHENTICATED_ACCESS,
    )

    if USE_SPEECH_OUTPUT_AZURE:
        current_app.logger.info("USE_SPEECH_OUTPUT_AZURE is true, setting up Azure speech service")
        if not AZURE_SPEECH_SERVICE_ID or AZURE_SPEECH_SERVICE_ID == "":
            raise ValueError("Azure speech resource not configured correctly, missing AZURE_SPEECH_SERVICE_ID")
        if not AZURE_SPEECH_SERVICE_LOCATION or AZURE_SPEECH_SERVICE_LOCATION == "":
            raise ValueError("Azure speech resource not configured correctly, missing AZURE_SPEECH_SERVICE_LOCATION")
        current_app.config[CONFIG_SPEECH_SERVICE_ID] = AZURE_SPEECH_SERVICE_ID
        current_app.config[CONFIG_SPEECH_SERVICE_LOCATION] = AZURE_SPEECH_SERVICE_LOCATION
        current_app.config[CONFIG_SPEECH_SERVICE_VOICE] = AZURE_SPEECH_SERVICE_VOICE
        # Wait until token is needed to fetch for the first time
        current_app.config[CONFIG_SPEECH_SERVICE_TOKEN] = None

    openai_client, azure_openai_endpoint = setup_openai_client(
        openai_host=OPENAI_HOST,
        azure_credential=azure_credential,
        azure_openai_service=AZURE_OPENAI_SERVICE,
        azure_openai_custom_url=AZURE_OPENAI_CUSTOM_URL,
        azure_openai_api_key=AZURE_OPENAI_API_KEY_OVERRIDE,
        openai_api_key=OPENAI_API_KEY,
        openai_organization=OPENAI_ORGANIZATION,
    )

    user_blob_manager = None
    if USE_USER_UPLOAD:
        current_app.logger.info("USE_USER_UPLOAD is true, setting up user upload feature")
        if not AZURE_USERSTORAGE_ACCOUNT or not AZURE_USERSTORAGE_CONTAINER:
            raise ValueError(
                "AZURE_USERSTORAGE_ACCOUNT and AZURE_USERSTORAGE_CONTAINER must be set when USE_USER_UPLOAD is true"
            )
        if not AZURE_ENFORCE_ACCESS_CONTROL:
            raise ValueError("AZURE_ENFORCE_ACCESS_CONTROL must be true when USE_USER_UPLOAD is true")
        user_blob_manager = AdlsBlobManager(
            endpoint=f"https://{AZURE_USERSTORAGE_ACCOUNT}.dfs.core.windows.net",
            container=AZURE_USERSTORAGE_CONTAINER,
            credential=azure_credential,
        )
        current_app.config[CONFIG_USER_BLOB_MANAGER] = user_blob_manager

        # Set up ingester
        file_processors, figure_processor = setup_file_processors(
            azure_credential=azure_credential,
            document_intelligence_service=os.getenv("AZURE_DOCUMENTINTELLIGENCE_SERVICE"),
            local_pdf_parser=os.getenv("USE_LOCAL_PDF_PARSER", "").lower() == "true",
            local_html_parser=os.getenv("USE_LOCAL_HTML_PARSER", "").lower() == "true",
            use_content_understanding=os.getenv("USE_CONTENT_UNDERSTANDING", "").lower() == "true",
            content_understanding_endpoint=os.getenv("AZURE_CONTENTUNDERSTANDING_ENDPOINT"),
            use_multimodal=USE_MULTIMODAL,
            openai_client=openai_client,
            openai_model=OPENAI_CHATGPT_MODEL,
            openai_deployment=AZURE_OPENAI_CHATGPT_DEPLOYMENT if OPENAI_HOST == OpenAIHost.AZURE else None,
        )
        search_info = setup_search_info(
            search_service=AZURE_SEARCH_SERVICE,
            index_name=AZURE_SEARCH_INDEX,
            azure_credential=azure_credential,
            use_agentic_knowledgebase=USE_AGENTIC_KNOWLEDGEBASE,
            azure_openai_endpoint=azure_openai_endpoint,
            knowledgebase_name=AZURE_SEARCH_KNOWLEDGEBASE_NAME,
            azure_openai_knowledgebase_deployment=AZURE_OPENAI_KNOWLEDGEBASE_DEPLOYMENT,
            azure_openai_knowledgebase_model=AZURE_OPENAI_KNOWLEDGEBASE_MODEL,
        )

        text_embeddings_service = None
        if USE_VECTORS:
            text_embeddings_service = setup_embeddings_service(
                open_ai_client=openai_client,
                openai_host=OPENAI_HOST,
                emb_model_name=OPENAI_EMB_MODEL,
                emb_model_dimensions=OPENAI_EMB_DIMENSIONS,
                azure_openai_deployment=AZURE_OPENAI_EMB_DEPLOYMENT,
                azure_openai_endpoint=azure_openai_endpoint,
            )

        image_embeddings_service = setup_image_embeddings_service(
            azure_credential=azure_credential,
            vision_endpoint=AZURE_VISION_ENDPOINT,
            use_multimodal=USE_MULTIMODAL,
        )
        ingester = UploadUserFileStrategy(
            search_info=search_info,
            file_processors=file_processors,
            embeddings=text_embeddings_service,
            image_embeddings=image_embeddings_service,
            search_field_name_embedding=AZURE_SEARCH_FIELD_NAME_EMBEDDING,
            blob_manager=user_blob_manager,
            figure_processor=figure_processor,
        )
        current_app.config[CONFIG_INGESTER] = ingester

    image_embeddings_client = None
    if USE_MULTIMODAL:
        image_embeddings_client = ImageEmbeddings(AZURE_VISION_ENDPOINT, azure_ai_token_provider)

    current_app.config[CONFIG_OPENAI_CLIENT] = openai_client
    current_app.config[CONFIG_SEARCH_CLIENT] = search_client
    current_app.config[CONFIG_KNOWLEDGEBASE_CLIENT] = knowledgebase_client
    current_app.config[CONFIG_KNOWLEDGEBASE_CLIENT_WITH_WEB] = knowledgebase_client_with_web
    current_app.config[CONFIG_KNOWLEDGEBASE_CLIENT_WITH_SHAREPOINT] = knowledgebase_client_with_sharepoint
    current_app.config[CONFIG_KNOWLEDGEBASE_CLIENT_WITH_WEB_AND_SHAREPOINT] = (
        knowledgebase_client_with_web_and_sharepoint
    )
    current_app.config[CONFIG_AUTH_CLIENT] = auth_helper

    current_app.config[CONFIG_SEMANTIC_RANKER_DEPLOYED] = AZURE_SEARCH_SEMANTIC_RANKER != "disabled"
    current_app.config[CONFIG_QUERY_REWRITING_ENABLED] = (
        AZURE_SEARCH_QUERY_REWRITING == "true" and AZURE_SEARCH_SEMANTIC_RANKER != "disabled"
    )
    current_app.config[CONFIG_DEFAULT_REASONING_EFFORT] = OPENAI_REASONING_EFFORT
    current_app.config[CONFIG_DEFAULT_RETRIEVAL_REASONING_EFFORT] = AGENTIC_KNOWLEDGEBASE_REASONING_EFFORT
    current_app.config[CONFIG_REASONING_EFFORT_ENABLED] = Approach.is_reasoning_model(OPENAI_CHATGPT_MODEL)
    current_app.config[CONFIG_REASONING_EFFORT_OPTIONS] = Approach.get_reasoning_effort_options(OPENAI_CHATGPT_MODEL)
    current_app.config[CONFIG_STREAMING_ENABLED] = True
    current_app.config[CONFIG_VECTOR_SEARCH_ENABLED] = bool(USE_VECTORS)
    current_app.config[CONFIG_USER_UPLOAD_ENABLED] = bool(USE_USER_UPLOAD)
    current_app.config[CONFIG_LANGUAGE_PICKER_ENABLED] = ENABLE_LANGUAGE_PICKER
    current_app.config[CONFIG_SPEECH_INPUT_ENABLED] = USE_SPEECH_INPUT_BROWSER
    current_app.config[CONFIG_SPEECH_OUTPUT_BROWSER_ENABLED] = USE_SPEECH_OUTPUT_BROWSER
    current_app.config[CONFIG_SPEECH_OUTPUT_AZURE_ENABLED] = USE_SPEECH_OUTPUT_AZURE
    current_app.config[CONFIG_CHAT_HISTORY_BROWSER_ENABLED] = USE_CHAT_HISTORY_BROWSER
    current_app.config[CONFIG_CHAT_HISTORY_COSMOS_ENABLED] = USE_CHAT_HISTORY_COSMOS
    current_app.config[CONFIG_AGENTIC_KNOWLEDGEBASE_ENABLED] = USE_AGENTIC_KNOWLEDGEBASE
    current_app.config[CONFIG_MULTIMODAL_ENABLED] = USE_MULTIMODAL
    current_app.config[CONFIG_RAG_SEARCH_TEXT_EMBEDDINGS] = RAG_SEARCH_TEXT_EMBEDDINGS
    current_app.config[CONFIG_RAG_SEARCH_IMAGE_EMBEDDINGS] = RAG_SEARCH_IMAGE_EMBEDDINGS
    current_app.config[CONFIG_RAG_SEND_TEXT_SOURCES] = RAG_SEND_TEXT_SOURCES
    current_app.config[CONFIG_RAG_SEND_IMAGE_SOURCES] = RAG_SEND_IMAGE_SOURCES
    current_app.config[CONFIG_WEB_SOURCE_ENABLED] = USE_WEB_SOURCE
    if AGENTIC_KNOWLEDGEBASE_REASONING_EFFORT == "minimal" and current_app.config[CONFIG_WEB_SOURCE_ENABLED]:
        raise ValueError("Web source cannot be used with minimal retrieval reasoning effort")
    current_app.config[CONFIG_SHAREPOINT_SOURCE_ENABLED] = USE_SHAREPOINT_SOURCE

    prompt_manager = PromptManager()

    # ChatReadRetrieveReadApproach is used by /chat for multi-turn conversation
    current_app.config[CONFIG_CHAT_APPROACH] = ChatReadRetrieveReadApproach(
        search_client=search_client,
        search_index_name=AZURE_SEARCH_INDEX,
        knowledgebase_model=AZURE_OPENAI_KNOWLEDGEBASE_MODEL,
        knowledgebase_deployment=AZURE_OPENAI_KNOWLEDGEBASE_DEPLOYMENT,
        knowledgebase_client=knowledgebase_client,
        knowledgebase_client_with_web=knowledgebase_client_with_web,
        knowledgebase_client_with_sharepoint=knowledgebase_client_with_sharepoint,
        knowledgebase_client_with_web_and_sharepoint=knowledgebase_client_with_web_and_sharepoint,
        openai_client=openai_client,
        chatgpt_model=OPENAI_CHATGPT_MODEL,
        chatgpt_deployment=AZURE_OPENAI_CHATGPT_DEPLOYMENT,
        embedding_model=OPENAI_EMB_MODEL,
        embedding_deployment=AZURE_OPENAI_EMB_DEPLOYMENT,
        embedding_dimensions=OPENAI_EMB_DIMENSIONS,
        embedding_field=AZURE_SEARCH_FIELD_NAME_EMBEDDING,
        sourcepage_field=KB_FIELDS_SOURCEPAGE,
        content_field=KB_FIELDS_CONTENT,
        query_language=AZURE_SEARCH_QUERY_LANGUAGE,
        query_speller=AZURE_SEARCH_QUERY_SPELLER,
        prompt_manager=prompt_manager,
        reasoning_effort=OPENAI_REASONING_EFFORT,
        multimodal_enabled=USE_MULTIMODAL,
        image_embeddings_client=image_embeddings_client,
        global_blob_manager=global_blob_manager,
        user_blob_manager=user_blob_manager,
        use_web_source=current_app.config[CONFIG_WEB_SOURCE_ENABLED],
        use_sharepoint_source=current_app.config[CONFIG_SHAREPOINT_SOURCE_ENABLED],
        retrieval_reasoning_effort=AGENTIC_KNOWLEDGEBASE_REASONING_EFFORT,
    )


@bp.after_app_serving
async def close_clients():
    await current_app.config[CONFIG_SEARCH_CLIENT].close()
    await current_app.config[CONFIG_GLOBAL_BLOB_MANAGER].close_clients()
    if user_blob_manager := current_app.config.get(CONFIG_USER_BLOB_MANAGER):
        await user_blob_manager.close_clients()
    await current_app.config[CONFIG_CREDENTIAL].close()


def create_app():
    app = Quart(__name__)
    app.register_blueprint(bp)
    app.register_blueprint(chat_history_cosmosdb_bp)

    if os.getenv("APPLICATIONINSIGHTS_CONNECTION_STRING"):
        app.logger.info("APPLICATIONINSIGHTS_CONNECTION_STRING is set, enabling Azure Monitor")
        configure_azure_monitor(
            instrumentation_options={
                "django": {"enabled": False},
                "psycopg2": {"enabled": False},
                "fastapi": {"enabled": False},
            }
        )
        # This tracks HTTP requests made by aiohttp:
        AioHttpClientInstrumentor().instrument()
        # This tracks HTTP requests made by httpx:
        HTTPXClientInstrumentor().instrument()
        # This tracks OpenAI SDK requests:
        OpenAIInstrumentor().instrument()
        # This middleware tracks app route requests:
        app.asgi_app = OpenTelemetryMiddleware(app.asgi_app)  # type: ignore[assignment]

    # Log levels should be one of https://docs.python.org/3/library/logging.html#logging-levels
    # Set root level to WARNING to avoid seeing overly verbose logs from SDKS
    logging.basicConfig(level=logging.WARNING)
    # Set our own logger levels to INFO by default
    app_level = os.getenv("APP_LOG_LEVEL", "INFO")
    app.logger.setLevel(os.getenv("APP_LOG_LEVEL", app_level))
    logging.getLogger("scripts").setLevel(app_level)

    if allowed_origin := os.getenv("ALLOWED_ORIGIN"):
        allowed_origins = allowed_origin.split(";")
        if len(allowed_origins) > 0:
            app.logger.info("CORS enabled for %s", allowed_origins)
            cors(app, allow_origin=allowed_origins, allow_methods=["GET", "POST"])

    # Start WhatsApp reminder scheduler (Task #32)
    _start_reminder_scheduler(app)

    return app
