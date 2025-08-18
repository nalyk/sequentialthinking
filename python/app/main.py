
import json
import sqlite3
import uuid
from typing import List, Optional, Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from mcp.server.fastmcp import FastMCP, Context
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Database layer
# ---------------------------------------------------------------------------

class SequenceDB:
    """Tiny SQLite helper used by the MCP server.

    The schema mirrors the TypeScript implementation and provides basic
    persistence for sequences and thoughts. This is intentionally minimal –
    large parts of the TypeScript logic (normalisation, branch limits, etc.) are
    handled in memory by the tool implementation below.
    """

    def __init__(self, path: str = "sequences.db") -> None:
        self.conn = sqlite3.connect(path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self._init_db()

    def _init_db(self) -> None:
        cur = self.conn.cursor()
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS sequences (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                created DATETIME DEFAULT CURRENT_TIMESTAMP,
                lastModified DATETIME DEFAULT CURRENT_TIMESTAMP,
                status TEXT DEFAULT 'active',
                thoughtCount INTEGER DEFAULT 0
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS thoughts (
                id TEXT PRIMARY KEY,
                sequenceId TEXT NOT NULL,
                thought TEXT NOT NULL,
                thoughtNumber INTEGER NOT NULL,
                totalThoughts INTEGER NOT NULL,
                nextThoughtNeeded BOOLEAN NOT NULL,
                isRevision BOOLEAN DEFAULT 0,
                revisesThought INTEGER,
                branchFromThought INTEGER,
                branchId TEXT,
                needsMoreThoughts BOOLEAN DEFAULT 0,
                thoughtType TEXT,
                verificationResult TEXT,
                relatedTo TEXT,
                created DATETIME DEFAULT CURRENT_TIMESTAMP,
                modified DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(sequenceId) REFERENCES sequences(id) ON DELETE CASCADE
            )
            """
        )
        self.conn.commit()

    # ------------------------------------------------------------------
    # sequence operations
    # ------------------------------------------------------------------

    def create_sequence(self, title: str, description: str | None = None) -> str:
        seq_id = str(uuid.uuid4())
        self.conn.execute(
            "INSERT INTO sequences (id, title, description) VALUES (?, ?, ?)",
            (seq_id, title, description),
        )
        self.conn.commit()
        return seq_id

    def get_sequence(self, seq_id: str) -> Optional[sqlite3.Row]:
        cur = self.conn.execute("SELECT * FROM sequences WHERE id = ?", (seq_id,))
        return cur.fetchone()

    def list_sequences(self, query: str | None = None, limit: int = 20) -> List[sqlite3.Row]:
        if query:
            like = f"%{query}%"
            cur = self.conn.execute(
                "SELECT * FROM sequences WHERE title LIKE ? OR description LIKE ? ORDER BY lastModified DESC LIMIT ?",
                (like, like, limit),
            )
        else:
            cur = self.conn.execute(
                "SELECT * FROM sequences ORDER BY lastModified DESC LIMIT ?",
                (limit,),
            )
        return cur.fetchall()

    def update_sequence_modified(self, seq_id: str) -> None:
        self.conn.execute(
            "UPDATE sequences SET lastModified = CURRENT_TIMESTAMP WHERE id = ?",
            (seq_id,),
        )
        self.conn.commit()

    def export_sequence(self, seq_id: str) -> dict:
        seq = self.get_sequence(seq_id)
        if not seq:
            raise ValueError("Sequence not found")
        thoughts = [dict(row) for row in self.conn.execute(
            "SELECT * FROM thoughts WHERE sequenceId = ? ORDER BY created",
            (seq_id,),
        )]
        return {
            "sequence": dict(seq),
            "thoughts": thoughts,
        }

    def import_sequence(self, data: dict) -> str:
        seq = data["sequence"]
        new_id = str(uuid.uuid4())
        self.conn.execute(
            "INSERT INTO sequences (id, title, description, created, lastModified, status, thoughtCount) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                new_id,
                seq["title"],
                seq.get("description"),
                seq.get("created"),
                seq.get("lastModified"),
                seq.get("status", "active"),
                seq.get("thoughtCount", 0),
            ),
        )
        for th in data.get("thoughts", []):
            self.conn.execute(
                """
                INSERT INTO thoughts (
                    id, sequenceId, thought, thoughtNumber, totalThoughts, nextThoughtNeeded,
                    isRevision, revisesThought, branchFromThought, branchId, needsMoreThoughts,
                    thoughtType, verificationResult, relatedTo, created, modified
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                """,
                (
                    th.get("id", str(uuid.uuid4())),
                    new_id,
                    th["thought"],
                    th["thoughtNumber"],
                    th["totalThoughts"],
                    int(th["nextThoughtNeeded"]),
                    int(th.get("isRevision", False)),
                    th.get("revisesThought"),
                    th.get("branchFromThought"),
                    th.get("branchId"),
                    int(th.get("needsMoreThoughts", False)),
                    th.get("thoughtType"),
                    th.get("verificationResult"),
                    th.get("relatedTo"),
                    th.get("created"),
                    th.get("modified"),
                ),
            )
        self.conn.commit()
        return new_id

    def add_thought(self, seq_id: str, data: dict) -> None:
        self.conn.execute(
            """
            INSERT INTO thoughts (
                id, sequenceId, thought, thoughtNumber, totalThoughts, nextThoughtNeeded,
                isRevision, revisesThought, branchFromThought, branchId, needsMoreThoughts,
                thoughtType, verificationResult, relatedTo
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                str(uuid.uuid4()),
                seq_id,
                data["thought"],
                data["thoughtNumber"],
                data["totalThoughts"],
                int(data["nextThoughtNeeded"]),
                int(data.get("isRevision", False)),
                data.get("revisesThought"),
                data.get("branchFromThought"),
                data.get("branchId"),
                int(data.get("needsMoreThoughts", False)),
                data.get("thoughtType"),
                data.get("verificationResult"),
                json.dumps(data.get("relatedTo")) if data.get("relatedTo") else None,
            ),
        )
        self.conn.execute(
            "UPDATE sequences SET thoughtCount = thoughtCount + 1, lastModified = CURRENT_TIMESTAMP WHERE id = ?",
            (seq_id,),
        )
        self.conn.commit()


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class SaveSequence(BaseModel):
    title: str
    description: Optional[str] = None


class LoadSequence(BaseModel):
    id: str


class SearchSequence(BaseModel):
    query: Optional[str] = None
    limit: int = 20
    contentSearch: bool = False


class ExportSequence(BaseModel):
    id: str


class ImportSequence(BaseModel):
    data: dict


class ThoughtInput(BaseModel):
    thought: str = Field(..., min_length=1, max_length=10000)
    nextThoughtNeeded: bool
    thoughtNumber: int = Field(..., gt=0)
    totalThoughts: int = Field(..., gt=0)
    isRevision: Optional[bool] = False
    revisesThought: Optional[int] = None
    branchFromThought: Optional[int] = None
    branchId: Optional[str] = None
    needsMoreThoughts: Optional[bool] = None
    thoughtType: Optional[Literal["hypothesis", "verification"]] = None
    verificationResult: Optional[Literal["confirmed", "refuted", "partial", "pending"]] = None
    relatedTo: Optional[List[int]] = None
    saveSequence: Optional[SaveSequence] = None
    loadSequence: Optional[LoadSequence] = None
    searchSequence: Optional[SearchSequence] = None
    exportSequence: Optional[ExportSequence] = None
    importSequence: Optional[ImportSequence] = None


# ---------------------------------------------------------------------------
# MCP Server setup
# ---------------------------------------------------------------------------

mcp_server = FastMCP("Sequential Thinking Python")
app: FastAPI = mcp_server.streamable_http_app

# Enable CORS like the TS server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple health endpoint
@app.get("/health")
async def health() -> dict:
    return {"status": "healthy"}

# Database instance
DB = SequenceDB()
thought_history: List[dict] = []
current_sequence_id: Optional[str] = None


@mcp_server.tool("sequential_thinking", description="Structured thinking with sequence persistence")
async def sequential_thinking(data: ThoughtInput, ctx: Context) -> dict:
    """Main tool replicating the TypeScript behaviour in Python."""
    global current_sequence_id

    # Sequence management -------------------------------------------------
    if data.searchSequence is not None:
        rows = DB.list_sequences(data.searchSequence.query, data.searchSequence.limit)
        return {
            "content": [{
                "type": "text",
                "text": json.dumps({
                    "sequences": [dict(r) for r in rows],
                    "totalCount": len(rows),
                }, indent=2),
            }]
        }

    if data.exportSequence is not None:
        export = DB.export_sequence(data.exportSequence.id)
        return {
            "content": [{"type": "text", "text": json.dumps(export, indent=2)}]
        }

    if data.importSequence is not None:
        new_id = DB.import_sequence(data.importSequence.data)
        return {
            "content": [{"type": "text", "text": json.dumps({"sequenceId": new_id}, indent=2)}]
        }

    if data.loadSequence is not None:
        seq = DB.get_sequence(data.loadSequence.id)
        if not seq:
            raise HTTPException(status_code=404, detail="Sequence not found")
        thoughts = DB.conn.execute(
            "SELECT * FROM thoughts WHERE sequenceId = ? ORDER BY created",
            (seq["id"],),
        ).fetchall()
        thought_history.clear()
        thought_history.extend([dict(t) for t in thoughts])
        current_sequence_id = seq["id"]
        return {
            "content": [{
                "type": "text",
                "text": json.dumps({
                    "action": "sequence_loaded",
                    "sequence": dict(seq),
                    "thoughtsLoaded": len(thoughts),
                }, indent=2),
            }]
        }

    if data.saveSequence is not None:
        seq_id = DB.create_sequence(data.saveSequence.title, data.saveSequence.description)
        for th in thought_history:
            DB.add_thought(seq_id, th)
        current_sequence_id = seq_id
        return {
            "content": [{
                "type": "text",
                "text": json.dumps({
                    "action": "sequence_saved",
                    "sequenceId": seq_id,
                    "title": data.saveSequence.title,
                    "thoughtsSaved": len(thought_history),
                }, indent=2),
            }]
        }

    # Store thought -------------------------------------------------------
    thought = data.model_dump(exclude_none=True, exclude={
        "saveSequence", "loadSequence", "searchSequence", "exportSequence", "importSequence"
    })
    thought_history.append(thought)
    if current_sequence_id:
        DB.add_thought(current_sequence_id, thought)
        DB.update_sequence_modified(current_sequence_id)

    response = {
        "thoughtNumber": data.thoughtNumber,
        "totalThoughts": data.totalThoughts,
        "nextThoughtNeeded": data.nextThoughtNeeded,
        "currentSequenceId": current_sequence_id,
    }
    return {"content": [{"type": "text", "text": json.dumps(response, indent=2)}]}


# ---------------------------------------------------------------------------
# Resources
# ---------------------------------------------------------------------------

@mcp_server.resource("sequence://current", description="Current active sequence metadata")
def current_sequence_resource() -> dict:
    if not current_sequence_id:
        return {"message": "No active sequence"}
    seq = DB.get_sequence(current_sequence_id)
    return dict(seq) if seq else {"message": "Sequence missing"}


@mcp_server.resource("sequences://library", description="List saved sequences")
def library_resource() -> dict:
    rows = DB.list_sequences(limit=100)
    return {"sequences": [dict(r) for r in rows]}


# ---------------------------------------------------------------------------
# Prompts (simplified templates)
# ---------------------------------------------------------------------------

@mcp_server.prompt("start_analysis", description="Template for starting analysis")
def start_analysis(problem: str, context: Optional[str] = None, goals: Optional[str] = None) -> str:
    return (
        f"Problem: {problem}\n"
        f"Context: {context or ''}\n"
        f"Goals: {goals or ''}"
    )


@mcp_server.prompt("hypothesis_verification", description="Template for verifying a hypothesis")
def hypothesis_verification(hypothesis: str, evidence_sources: Optional[str] = None, test_methods: Optional[str] = None) -> str:
    return (
        f"Hypothesis: {hypothesis}\n"
        f"Evidence: {evidence_sources or ''}\n"
        f"Tests: {test_methods or ''}"
    )
# Additional prompts from the TS server can be added similarly


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    # When executed directly we run an HTTP server; FastMCP uses uvicorn under
    # the hood. The server also supports STDIO or SSE transports if required.
    mcp_server.run()
