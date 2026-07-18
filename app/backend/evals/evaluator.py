"""
RAGAs-powered evaluator for Project Ease (ragas >= 0.4.x API).

Metrics computed after every query (fire-and-forget, never blocks response):
  - faithfulness            : does the answer stick to the retrieved documents? (hallucination check)
  - answer_relevancy        : does the answer address what the user actually asked?
  - context_precision       : are the retrieved chunks useful for the question?

Why RAGAs: industry-standard methodology, peer-reviewed metrics, recognized in
technical interviews and hiring portfolios.
"""

import logging
from typing import Optional

from evals.db import init_db, insert_eval

logger = logging.getLogger("evals")

init_db()


async def run_eval(
    *,
    openai_client,
    judge_model: str,
    organization_id: Optional[str],
    original_query: str,
    rewritten_query: Optional[str],
    retrieved_docs: list[str],
    retrieved_texts: list[str],
    answer: str,
    chat_model: str,
    latency_ms: int,
):
    """
    Run RAGAs evaluation for one query and persist to SQLite.
    Called via asyncio.ensure_future() — never blocks the HTTP response.
    """
    if not retrieved_texts:
        logger.info("Skipping eval — no retrieved docs.")
        return
    # If answer is unexpectedly empty, run context_precision only (doesn't need an answer)
    _has_answer = bool(answer and answer.strip())

    try:
        from ragas import EvaluationDataset, SingleTurnSample, evaluate
        from ragas.llms import LangchainLLMWrapper
        from ragas.metrics import AnswerRelevancy, Faithfulness, LLMContextPrecisionWithoutReference
        from langchain_openai import ChatOpenAI
        import os

        # RAGAs 0.4.x needs a LangChain-wrapped LLM
        llm = LangchainLLMWrapper(ChatOpenAI(
            model=judge_model,
            api_key=os.environ.get("OPENAI_API_KEY", ""),
        ))

        sample = SingleTurnSample(
            user_input=original_query,
            response=answer if _has_answer else "",
            retrieved_contexts=retrieved_texts,
        )
        dataset = EvaluationDataset(samples=[sample])

        # LLMContextPrecisionWithoutReference only needs question + contexts, no answer.
        # Faithfulness + AnswerRelevancy need the real answer — only add when present.
        metrics = [LLMContextPrecisionWithoutReference(llm=llm)]
        if _has_answer:
            metrics += [Faithfulness(llm=llm), AnswerRelevancy(llm=llm)]

        result = evaluate(dataset=dataset, metrics=metrics)
        scores = result.to_pandas().iloc[0]

        faithfulness_score = float(scores.get("faithfulness", 0))
        relevancy_score    = float(scores.get("answer_relevancy", 0))
        precision_score    = float(scores.get("llm_context_precision_without_reference", 0))

        precision_at_k         = precision_score
        answer_relevance_score = round((faithfulness_score + relevancy_score) / 2, 3)
        answer_relevance_reason = (
            f"faithfulness={faithfulness_score:.2f}, "
            f"answer_relevancy={relevancy_score:.2f}, "
            f"context_precision={precision_score:.2f}"
        )

        insert_eval(
            organization_id=organization_id,
            original_query=original_query,
            rewritten_query=rewritten_query,
            retrieved_docs=retrieved_docs,
            answer=answer,
            precision_at_k=precision_at_k,
            answer_relevance_score=answer_relevance_score,
            answer_relevance_reason=answer_relevance_reason,
            model=chat_model,
            latency_ms=latency_ms,
        )

        logger.info(
            "RAGAs eval saved — faithfulness=%.2f, relevancy=%.2f, precision=%.2f, org=%s",
            faithfulness_score, relevancy_score, precision_score, organization_id,
        )

    except ImportError as e:
        logger.warning("RAGAs import failed: %s", e)
    except Exception as e:
        logger.error("RAGAs eval failed: %s", e, exc_info=True)
