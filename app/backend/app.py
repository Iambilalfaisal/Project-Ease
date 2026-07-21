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
    # admin
    get_all_orgs, create_org, update_org, delete_org,
    get_org_details, get_platform_stats,
)

# Initialise DB (creates tables + seeds dev data) at import time
init_db()

_sessions: dict[str, dict] = {}  # token → session dict  (in-memory; fine for MVP)


def _get_session(req=None) -> dict | None:
    r = req or request
    token = r.headers.get("Authorization", "").removeprefix("Bearer ").strip()
    return _sessions.get(token)


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
        return jsonify({"token": token, "user": session_data})

    user = get_user_by_email(email)
    if not user or not _check_pw(password, user["password_hash"]):
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
    _sessions.pop(token, None)
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
    return jsonify(updated)


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
    # Generate a temp password; real flow would email this
    temp_pw = _secrets.token_urlsafe(8)
    try:
        user = create_user(
            org_id=session.get("org") or "",
            email=email, name=name, role=role,
            actor=session.get("user_id") or SYSTEM,
            password=temp_pw, must_change=True,
        )
        return jsonify({**user, "temp_password": temp_pw}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/team/<user_id>", methods=["DELETE"])
async def remove_member(user_id: str):
    session = _get_session()
    if not session or session.get("role") != "org_owner":
        return jsonify({"error": "Unauthorized"}), 401
    # Invalidate any active sessions for this user
    for tok, s in list(_sessions.items()):
        if s.get("user_id") == user_id:
            _sessions.pop(tok, None)
    delete_user(user_id, actor=session.get("user_id") or SYSTEM)
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

    return app
