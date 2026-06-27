#!/usr/bin/env python3
"""Agent-as-code: reconcile AgentGuard's Aura Agent definition with Neo4j Aura.

Usage:
    python scripts/create_aura_agent.py           # status (default)
    python scripts/create_aura_agent.py --pull    # fetch from Aura → local JSON
    python scripts/create_aura_agent.py --push    # push local JSON → Aura

Requires environment:
    AURA_CLIENT_ID     — Neo4j Aura API client ID
    AURA_CLIENT_SECRET — Neo4j Aura API client secret
    AURA_AGENT_ID      — Aura Agent ID (pulled from status if not set)
"""

import json, os, sys, urllib.request, base64
from pathlib import Path

AGENT_FILE = Path(__file__).resolve().parent.parent / "agents" / "agentguard.json"
AURA_API = "https://api.neo4j.io/v2beta1/agents"

def _bearer():
    cid = os.environ.get("AURA_CLIENT_ID", "")
    secret = os.environ.get("AURA_CLIENT_SECRET", "")
    if not cid or not secret:
        print("FATAL: AURA_CLIENT_ID and AURA_CLIENT_SECRET must be set")
        sys.exit(1)
    creds = base64.b64encode(f"{cid}:{secret}".encode()).decode()
    req = urllib.request.Request(
        "https://api.neo4j.io/oauth/token",
        data=b"grant_type=client_credentials",
        headers={"Authorization": f"Basic {creds}", "Content-Type": "application/x-www-form-urlencoded"},
    )
    with urllib.request.urlopen(req) as r:
        return json.load(r)["access_token"]

def _headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

def _agent_id():
    return os.environ.get("AURA_AGENT_ID", "")

def status():
    token = _bearer()
    h = _headers(token)
    req = urllib.request.Request(f"{AURA_API}?page_size=50", headers=h)
    with urllib.request.urlopen(req) as r:
        agents = json.load(r).get("data", [])
    if not agents:
        print("No agents found on this Aura tenant.")
        return
    for a in agents:
        print(f"  {a['id']}: {a['name']} ({a['state']}) — {a.get('toolCount', 0)} tools")

def pull():
    token = _bearer()
    h = _headers(token)
    aid = _agent_id()
    if not aid:
        # list and pick first
        req = urllib.request.Request(f"{AURA_API}?page_size=50", headers=h)
        with urllib.request.urlopen(req) as r:
            agents = json.load(r).get("data", [])
        if not agents:
            print("No agents found. Set AURA_AGENT_ID or create one via --push.")
            return
        aid = agents[0]["id"]
        print(f"Using agent: {aid} ({agents[0]['name']})")
    req = urllib.request.Request(f"{AURA_API}/{aid}", headers=h)
    with urllib.request.urlopen(req) as r:
        agent = json.load(r)
    with open(AGENT_FILE, "w") as f:
        json.dump(agent, f, indent=2)
    print(f"Pulled agent {aid} → {AGENT_FILE}")

def push():
    if not AGENT_FILE.exists():
        print(f"FATAL: {AGENT_FILE} not found. Create it first.")
        sys.exit(1)
    with open(AGENT_FILE) as f:
        agent = json.load(f)
    token = _bearer()
    h = _headers(token)
    aid = _agent_id()
    body = json.dumps(agent).encode()
    if aid:
        req = urllib.request.Request(f"{AURA_API}/{aid}", data=body, headers=h, method="PATCH")
        with urllib.request.urlopen(req) as r:
            print(f"Updated agent {aid} → {r.status}")
    else:
        req = urllib.request.Request(f"{AURA_API}", data=body, headers=h, method="POST")
        with urllib.request.urlopen(req) as r:
            created = json.load(r)
            print(f"Created agent {created['id']} → set AURA_AGENT_ID={created['id']}")

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "status"
    if mode == "--pull": pull()
    elif mode == "--push": push()
    else: status()
