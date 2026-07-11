import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link, useLocation } from "wouter";
import { PlusIcon, TrashIcon, Pencil1Icon, PlayIcon, ClockIcon } from "@radix-ui/react-icons";
import DashboardLayout from "@/components/DashboardLayout";
import { useState, useEffect } from "react";

export default function AgentsList() {
  const { data: agents = [] } = trpc.agents.list.useQuery();
  const deleteAgent = trpc.agents.delete.useMutation();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [scheduled, setScheduled] = useState<Record<number, boolean>>({});
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (deleteId === null) return;
    if (confirm("DELETE THIS AGENT?")) {
      deleteAgent.mutateAsync({ agentId: deleteId }).finally(() => setDeleteId(null));
    } else {
      setDeleteId(null);
    }
  }, [deleteId]);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-sm tracking-[0.15em] text-[#8A8A8A]">&lt; ENDPOINTS /&gt;</p>
            <h1 className="mt-2 font-display text-5xl font-black uppercase tracking-[-0.04em]">AGENTS</h1>
          </div>
          <Link href="/agents/new">
            <Button className="gap-2">
              <PlusIcon className="h-4 w-4" /> [ ADD AGENT ]
            </Button>
          </Link>
        </div>

        {agents.length > 0 ? (
          <div className="space-y-[1px] bg-[#2A2A2A]">
            {agents.map((agent) => (
              <Card key={agent.id} className="bg-[#121212] p-6 border-0">
                <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                  <div className="flex-1">
                    <h3 className="font-mono text-base font-semibold tracking-[0.05em]">{agent.name}</h3>
                    <p className="font-mono text-[11px] text-[#8A8A8A]">{agent.url}</p>
                    {agent.description && (
                      <p className="mt-2 font-mono text-[11px] text-[#8A8A8A]">{agent.description}</p>
                    )}
                    {/* impeccable-variants-start dd98595c */}
                    <style data-impeccable-css="dd98595c">{`
                      @scope ([data-impeccable-variant="1"]) {
                        :scope > .il-v-compact {
                          margin-top: 12px;
                        }
                        :scope > .il-v-compact button {
                          display: inline-flex;
                          align-items: center;
                          gap: calc(var(--p-density, 1) * 6px);
                          padding: calc(var(--p-density, 1) * 4px) calc(var(--p-density, 1) * 10px);
                          background: #E61919;
                          color: white;
                          border: none;
                          font-family: "JetBrains Mono", monospace;
                          font-size: 11px;
                          letter-spacing: 0.06em;
                          text-transform: uppercase;
                          cursor: pointer;
                          transition: background 150ms;
                        }
                        :scope > .il-v-compact button:hover {
                          background: #CC0000;
                        }
                      }
                      @scope ([data-impeccable-variant="2"]) {
                        :scope > .il-v-icon-only {
                          margin-top: 12px;
                        }
                        :scope > .il-v-icon-only button {
                          display: inline-flex;
                          align-items: center;
                          justify-content: center;
                          width: calc(var(--p-density, 1) * 32px);
                          height: calc(var(--p-density, 1) * 32px);
                          background: #E61919;
                          color: white;
                          border: none;
                          cursor: pointer;
                          transition: background 150ms;
                        }
                        :scope > .il-v-icon-only button:hover {
                          background: #CC0000;
                        }
                      }
                      @scope ([data-impeccable-variant="3"]) {
                        :scope > .il-v-outline-sm {
                          margin-top: 12px;
                        }
                        :scope > .il-v-outline-sm button {
                          display: inline-flex;
                          align-items: center;
                          gap: calc(var(--p-density, 1) * 5px);
                          padding: calc(var(--p-density, 1) * 3px) calc(var(--p-density, 1) * 8px);
                          background: transparent;
                          color: #E61919;
                          border: 1px solid #E61919;
                          font-family: "JetBrains Mono", monospace;
                          font-size: 10px;
                          letter-spacing: 0.08em;
                          text-transform: uppercase;
                          cursor: pointer;
                          transition: all 150ms;
                        }
                        :scope > .il-v-outline-sm button:hover {
                          background: #E61919;
                          color: white;
                        }
                      }
                    `}</style>
                    <div data-impeccable-variant="1" data-impeccable-params='[{"id":"density","kind":"range","min":0.6,"max":1.4,"step":0.05,"default":1,"label":"Density"}]'>
                      <div className="il-v-compact">
                        <Link href={`/agents/${agent.id}/test`}>
                          <button><PlayIcon className="h-3 w-3" /> RUN SUITE</button>
                        </Link>
                      </div>
                    </div>
                    <div data-impeccable-variant="2" style={{display: 'none'}} data-impeccable-params='[{"id":"density","kind":"range","min":0.6,"max":1.4,"step":0.05,"default":1,"label":"Density"}]'>
                      <div className="il-v-icon-only">
                        <Link href={`/agents/${agent.id}/test`}>
                          <button title="Run full adversarial suite"><PlayIcon className="h-4 w-4" /></button>
                        </Link>
                      </div>
                    </div>
                    <div data-impeccable-variant="3" style={{display: 'none'}} data-impeccable-params='[{"id":"density","kind":"range","min":0.6,"max":1.4,"step":0.05,"default":1,"label":"Density"}]'>
                      <div className="il-v-outline-sm">
                        <Link href={`/agents/${agent.id}/test`}>
                          <button><PlayIcon className="h-3 w-3" /> TEST</button>
                        </Link>
                      </div>
                    </div>
                    {/* impeccable-variants-end dd98595c */}
                  </div>
                  {/* impeccable-variants-start 7bab368e */}
                  <style data-impeccable-css="7bab368e">{`
                    @scope ([data-impeccable-variant="1"]) {
                      :scope > .il-v-icons {
                        display: flex;
                        align-items: center;
                        gap: calc(var(--p-density, 1) * 2px);
                      }
                      :scope > .il-v-icons button,
                      :scope > .il-v-icons a button {
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        width: calc(var(--p-density, 1) * 28px);
                        height: calc(var(--p-density, 1) * 28px);
                        border: 1px solid #2A2A2A;
                        background: transparent;
                        color: #8A8A8A;
                        font-family: "JetBrains Mono", monospace;
                        font-size: 11px;
                        cursor: pointer;
                        transition: all 150ms;
                        padding: 0;
                      }
                      :scope > .il-v-icons button:hover {
                        border-color: #EAEAEA;
                        color: #EAEAEA;
                      }
                      :scope > .il-v-icons button.il-v-danger {
                        color: #E61919;
                      }
                      :scope > .il-v-icons button.il-v-danger:hover {
                        border-color: #E61919;
                      }
                    }
                    @scope ([data-impeccable-variant="2"]) {
                      :scope > .il-v-tiny {
                        display: flex;
                        align-items: center;
                        gap: calc(var(--p-density, 1) * 4px);
                      }
                      :scope > .il-v-tiny button,
                      :scope > .il-v-tiny a button {
                        display: inline-flex;
                        align-items: center;
                        gap: 3px;
                        padding: calc(var(--p-density, 1) * 2px) calc(var(--p-density, 1) * 6px);
                        border: 1px solid #2A2A2A;
                        background: transparent;
                        color: #8A8A8A;
                        font-family: "JetBrains Mono", monospace;
                        font-size: 9px;
                        letter-spacing: 0.08em;
                        text-transform: uppercase;
                        cursor: pointer;
                        transition: all 150ms;
                        white-space: nowrap;
                      }
                      :scope > .il-v-tiny button:hover {
                        border-color: #EAEAEA;
                        color: #EAEAEA;
                      }
                      :scope > .il-v-tiny button.il-v-danger {
                        color: #E61919;
                      }
                      :scope > .il-v-tiny button.il-v-danger:hover {
                        border-color: #E61919;
                      }
                    }
                    @scope ([data-impeccable-variant="3"]) {
                      :scope > .il-v-links {
                        display: flex;
                        align-items: center;
                        gap: calc(var(--p-density, 1) * 8px);
                      }
                      :scope > .il-v-links button,
                      :scope > .il-v-links a button {
                        display: inline-flex;
                        align-items: center;
                        gap: 4px;
                        padding: 0;
                        border: none;
                        background: transparent;
                        color: #6B6B6B;
                        font-family: "JetBrains Mono", monospace;
                        font-size: 10px;
                        letter-spacing: 0.08em;
                        text-transform: uppercase;
                        cursor: pointer;
                        transition: color 150ms;
                        text-decoration: none;
                      }
                      :scope > .il-v-links button:hover {
                        color: #EAEAEA;
                      }
                      :scope > .il-v-links button.il-v-danger {
                        color: #E61919;
                      }
                      :scope > .il-v-links button.il-v-danger:hover {
                        color: #E61919;
                      }
                    }
                  `}</style>
                  <div data-impeccable-variant="1" data-impeccable-params='[{"id":"density","kind":"range","min":0.6,"max":1.4,"step":0.05,"default":1,"label":"Density"}]'>
                    <div className="il-v-icons">
                      <button title="Schedule" onClick={() => setScheduled(s => ({ ...s, [agent.id]: !s[agent.id] }))}>
                        <ClockIcon className="h-3 w-3" />
                      </button>
                      <a href={`/agents/${agent.id}/test`}><button title="Test"><PlayIcon className="h-3 w-3" /></button></a>
                      <a href={`/agents/${agent.id}/edit`}><button title="Edit"><Pencil1Icon className="h-3 w-3" /></button></a>
                      <button title="Delete" className="il-v-danger" onClick={() => setDeleteId(agent.id)}>
                        <TrashIcon className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <div data-impeccable-variant="2" style={{display: 'none'}} data-impeccable-params='[{"id":"density","kind":"range","min":0.6,"max":1.4,"step":0.05,"default":1,"label":"Density"}]'>
                    <div className="il-v-tiny">
                      <button onClick={() => setScheduled(s => ({ ...s, [agent.id]: !s[agent.id] }))}>
                        <ClockIcon className="h-3 w-3" />{scheduled[agent.id] ? "SCHD" : "SCHD"}
                      </button>
                      <a href={`/agents/${agent.id}/test`}><button><PlayIcon className="h-3 w-3" />TEST</button></a>
                      <a href={`/agents/${agent.id}/edit`}><button><Pencil1Icon className="h-3 w-3" />EDIT</button></a>
                      <button className="il-v-danger" onClick={() => setDeleteId(agent.id)}>
                        <TrashIcon className="h-3 w-3" />DEL
                      </button>
                    </div>
                  </div>
                  <div data-impeccable-variant="3" style={{display: 'none'}} data-impeccable-params='[{"id":"density","kind":"range","min":0.6,"max":1.4,"step":0.05,"default":1,"label":"Density"}]'>
                    <div className="il-v-links">
                      <button onClick={() => setScheduled(s => ({ ...s, [agent.id]: !s[agent.id] }))}>
                        <ClockIcon className="h-3 w-3" />{scheduled[agent.id] ? "SCHEDULED" : "SCHEDULE"}
                      </button>
                      <a href={`/agents/${agent.id}/test`}><button><PlayIcon className="h-3 w-3" />TEST</button></a>
                      <a href={`/agents/${agent.id}/edit`}><button><Pencil1Icon className="h-3 w-3" />EDIT</button></a>
                      <button className="il-v-danger" onClick={() => setDeleteId(agent.id)}>
                        <TrashIcon className="h-3 w-3" />DELETE
                      </button>
                    </div>
                  </div>
                  {/* impeccable-variants-end 7bab368e */}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <p className="font-mono text-base text-[#8A8A8A]">NO AGENTS REGISTERED</p>
            <Link href="/agents/new">
              <Button className="mt-4 gap-2">
                <PlusIcon className="h-4 w-4" /> [ CREATE FIRST AGENT ]
              </Button>
            </Link>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
