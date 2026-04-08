"""
Per-session conversation memory using LangChain InMemoryChatMessageHistory.

Replaces the raw deque-based _SESSION_HISTORY from chat_repo.py.
Limited to MAX_SESSIONS concurrent sessions with FIFO eviction.
Each session keeps at most MAX_TURNS * 2 messages (user + AI pairs).
"""
from __future__ import annotations

from langchain_core.chat_history import InMemoryChatMessageHistory
from langchain_core.messages import BaseMessage

MAX_SESSIONS = 500
MAX_TURNS = 10  # each "turn" = 1 user message + 1 AI response

_MEMORIES: dict[str, InMemoryChatMessageHistory] = {}


def get_memory(session_id: str | None) -> InMemoryChatMessageHistory:
    """Return (or create) the ChatMessageHistory for a session.

    Ephemeral sessions (no session_id) return a fresh instance that is NOT
    stored — callers should not call save_to_memory() for them.
    """
    if not session_id:
        return InMemoryChatMessageHistory()

    if session_id not in _MEMORIES:
        if len(_MEMORIES) >= MAX_SESSIONS:
            oldest = next(iter(_MEMORIES))
            del _MEMORIES[oldest]
        _MEMORIES[session_id] = InMemoryChatMessageHistory()

    return _MEMORIES[session_id]


def save_to_memory(
    memory: InMemoryChatMessageHistory,
    human_text: str,
    ai_text: str,
) -> None:
    """Append a user/AI exchange, trimming to MAX_TURNS if needed."""
    memory.add_user_message(human_text)
    memory.add_ai_message(ai_text)

    msgs: list[BaseMessage] = memory.messages
    max_msgs = MAX_TURNS * 2
    if len(msgs) > max_msgs:
        trimmed = msgs[-max_msgs:]
        memory.clear()
        for msg in trimmed:
            memory.add_message(msg)


def get_history_messages(session_id: str | None) -> list[BaseMessage]:
    """Return the current message list for a session (read-only)."""
    return get_memory(session_id).messages


def clear_memory(session_id: str) -> None:
    _MEMORIES.pop(session_id, None)


def clear_all_memories() -> None:
    _MEMORIES.clear()
