import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from "recharts";

// ─── PALETA ───────────────────────────────────────────────────────────────────
const C = {
  laranja: "#E8531A", laranjaLight: "#F97316",
  preto: "#0A0A0A", escuro: "#141414", medio: "#1E1E1E",
  claro: "#282828", borda: "#2E2E2E", texto: "#888", sub: "#555",
  branco: "#FFFFFF", brancoSoft: "#E8E8E8",
  verde: "#22C55E", amarelo: "#EAB308", vermelho: "#EF4444",
};

// ─── METAS ────────────────────────────────────────────────────────────────────
const METAS = { nps: 8, sprints: 80, acoes: 75, rituais: 3, delegacoes: 5, percTime: 4.0, entregas: 85, satisfacao: 4.0, turnover: 8 };

const COORDENADORES = ["Jovânia","Leonardo","Keilla","Rebeca","Thalita","Flavia Guaraldo","Gabriel","Pedro","Daniel","Anna Kelly","André","Katielle","Vinícius"];
const MENTORES = ["Eduardo Zanini","Cris"];
const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

// ─── UTILS ────────────────────────────────────────────────────────────────────
const avg = (arr, key) => {
  const vals = arr.map(r => parseFloat(r[key])).filter(v => !isNaN(v));
  if (!vals.length) return 0;
  return +(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1);
};
const pct = (arr, key) => {
  const vals = arr.map(r => r[key]);
  const sim = vals.filter(v => v === "Sim" || v === true || v === "true").length;
  return vals.length ? Math.round((sim/vals.length)*100) : 0;
};
const st = (val, meta, inv=false) => {
  if (inv) return val <= meta ? "ok" : val <= meta*1.3 ? "av" : "al";
  return val >= meta ? "ok" : val >= meta*0.9 ? "av" : "al";
};
const cor = s => s==="ok" ? C.verde : s==="av" ? C.amarelo : C.vermelho;
const ico = s => s==="ok" ? "✅" : s==="av" ? "⚠️" : "🔴";
const label = s => s==="ok" ? "Meta atingida" : s==="av" ? "Atenção" : "Abaixo da meta";
const mesAtual = () => { const d=new Date(); return `${MESES[d.getMonth()]}/${d.getFullYear()}`; };

// ─── STORAGE ──────────────────────────────────────────────────────────────────
const STORAGE_KEY = "zellider_registros_v2";
const salvar = (dados) => {
  try { window.storage?.set(STORAGE_KEY, JSON.stringify(dados), false); } catch(e){}
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(dados)); } catch(e){}
};
const carregar = async () => {
  try {
    const r = await window.storage?.get(STORAGE_KEY, false);
    if (r?.value) return JSON.parse(r.value);
  } catch(e){}
  try {
    const r = sessionStorage.getItem(STORAGE_KEY);
    if (r) return JSON.parse(r);
  } catch(e){}
  return [];
};

// ─── COMPONENTES BASE ─────────────────────────────────────────────────────────
const Btn = ({children, onClick, variant="primary", size="md", disabled=false, style={}}) => {
  const base = {
    border:"none", borderRadius:6, cursor: disabled?"not-allowed":"pointer",
    fontWeight:700, transition:"all 0.15s", opacity: disabled?0.5:1,
    fontSize: size==="sm"?11:13,
    padding: size==="sm"?"6px 14px": size==="lg"?"14px 28px":"10px 20px",
    ...(variant==="primary"?{background:C.laranja,color:C.branco}:
        variant==="ghost"?{background:"transparent",color:C.texto,border:`1px solid ${C.borda}`}:
        {background:C.claro,color:C.brancoSoft,border:`1px solid ${C.borda}`}),
    ...style,
  };
  return <button style={base} onClick={onClick} disabled={disabled}>{children}</button>;
};

const Card = ({children, style={}}) => (
  <div style={{background:C.medio,border:`1px solid ${C.borda}`,borderRadius:8,padding:"20px 24px",...style}}>
    {children}
  </div>
);

const KPI = ({titulo, valor, meta, unidade="", inv=false, descricao}) => {
  const s = st(parseFloat(valor), meta, inv);
  return (
    <div style={{background:C.medio,border:`1px solid ${C.borda}`,borderTop:`3px solid ${cor(s)}`,borderRadius:8,padding:"18px 20px"}}>
      <div style={{fontSize:10,color:C.texto,letterSpacing:1,textTransform:"uppercase",fontFamily:"monospace",marginBottom:8}}>{titulo}</div>
      <div style={{display:"flex",alignItems:"baseline",gap:5,marginBottom:6}}>
        <span style={{fontSize:34,fontWeight:900,color:C.branco,lineHeight:1}}>{valor}</span>
        <span style={{fontSize:13,color:C.texto}}>{unidade}</span>
      </div>
      <div style={{fontSize:11,color:cor(s),fontWeight:700,marginBottom:2}}>{ico(s)} {label(s)}</div>
      <div style={{fontSize:10,color:C.sub}}>meta {inv?"≤":"≥"} {meta}{unidade}</div>
      {descricao && <div style={{fontSize:10,color:C.sub,marginTop:4}}>{descricao}</div>}
    </div>
  );
};

const Secao = ({titulo, sub, children, action}) => (
  <div style={{marginBottom:36}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,paddingLeft:14,borderLeft:`3px solid ${C.laranja}`}}>
      <div>
        <div style={{fontSize:12,fontWeight:800,color:C.branco,textTransform:"uppercase",letterSpacing:1.5}}>{titulo}</div>
        {sub && <div style={{fontSize:11,color:C.texto,marginTop:2}}>{sub}</div>}
      </div>
      {action}
    </div>
    {children}
  </div>
);

const Tip = ({active,payload,label:lb}) => {
  if (!active||!payload?.length) return null;
  return (
    <div style={{background:C.escuro,border:`1px solid ${C.borda}`,borderRadius:6,padding:"10px 14px"}}>
      <div style={{color:C.branco,fontSize:12,fontWeight:700,marginBottom:4}}>{lb}</div>
      {payload.map((p,i)=><div key={i} style={{color:p.color,fontSize:11}}>{p.name}: {p.value}</div>)}
    </div>
  );
};

// ─── FORMULÁRIO DE REGISTRO ───────────────────────────────────────────────────
const FORM_INICIAL = {
  mes:"", coordenador:"", mentor:"",
  nps:"", sprintConcluida:"Sim",
  acoesPlaneadas:"", acoesRealizadas:"",
  rit1x1:"Sim", ritReuniao:"Sim", ritFeedback:"Sim", ritPlanning:"Sim",
  delegacoes:"", percLideranca:"", percComunicacao:"", percSuportes:"",
  entregas:"", retrabalho:"", turnover:"", satisfacao:"",
  observacoes:"",
};

const Formulario = ({ onSalvar, onCancelar }) => {
  const [form, setForm] = useState({...FORM_INICIAL, mes: mesAtual()});
  const [salvando, setSalvando] = useState(false);
  const [etapa, setEtapa] = useState(1);

  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const Input = ({label, campo, tipo="number", placeholder=""}) => (
    <div>
      <div style={{fontSize:11,color:C.texto,marginBottom:4}}>{label}</div>
      <input
        type={tipo} value={form[campo]} placeholder={placeholder}
        onChange={e=>set(campo,e.target.value)}
        style={{width:"100%",background:C.claro,border:`1px solid ${C.borda}`,borderRadius:6,
          padding:"9px 12px",color:C.branco,fontSize:13,outline:"none",boxSizing:"border-box"}}
      />
    </div>
  );

  const Toggle = ({label, campo}) => (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
      background:C.claro,borderRadius:6,padding:"10px 14px",border:`1px solid ${C.borda}`}}>
      <span style={{fontSize:12,color:C.brancoSoft}}>{label}</span>
      <div style={{display:"flex",gap:6}}>
        {["Sim","Não"].map(op=>(
          <button key={op} onClick={()=>set(campo,op)} style={{
            padding:"4px 12px",borderRadius:4,border:"none",cursor:"pointer",fontSize:11,fontWeight:700,
            background: form[campo]===op ? (op==="Sim"?C.verde:C.vermelho) : C.borda,
            color: form[campo]===op ? C.branco : C.texto,
          }}>{op}</button>
        ))}
      </div>
    </div>
  );

  const handleSalvar = async () => {
    if (!form.coordenador || !form.nps || !form.mes) {
      alert("Preencha pelo menos: Mês, Coordenador e NPS.");
      return;
    }
    setSalvando(true);
    await new Promise(r=>setTimeout(r,400));
    const registro = {
      ...form, id: Date.now(),
      dataRegistro: new Date().toLocaleDateString("pt-BR"),
      acoesPct: form.acoesPlaneadas && form.acoesRealizadas
        ? Math.round((parseFloat(form.acoesRealizadas)/parseFloat(form.acoesPlaneadas))*100)
        : "",
      totalRituais: [form.rit1x1,form.ritReuniao,form.ritFeedback,form.ritPlanning].filter(r=>r==="Sim").length,
    };
    onSalvar(registro);
    setSalvando(false);
  };

  const etapas = [
    { label: "Mentoria", icone: "🎯" },
    { label: "Rotina", icone: "📋" },
    { label: "Time", icone: "👥" },
    { label: "Negócio", icone: "📈" },
  ];

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",
      alignItems:"center",justifyContent:"center",zIndex:1000,padding:20}}>
      <div style={{background:C.escuro,border:`1px solid ${C.borda}`,borderRadius:12,
        width:"100%",maxWidth:560,maxHeight:"90vh",overflowY:"auto"}}>

        {/* Header */}
        <div style={{padding:"20px 24px",borderBottom:`1px solid ${C.borda}`,
          display:"flex",justifyContent:"space-between",alignItems:"center",
          position:"sticky",top:0,background:C.escuro,zIndex:10}}>
          <div>
            <div style={{fontSize:15,fontWeight:800,color:C.branco}}>📝 Registro de Mentoria</div>
            <div style={{fontSize:11,color:C.texto,marginTop:2}}>Preencha após cada sessão</div>
          </div>
          <button onClick={onCancelar} style={{background:"none",border:"none",color:C.texto,
            fontSize:20,cursor:"pointer",lineHeight:1}}>×</button>
        </div>

        {/* Steps */}
        <div style={{display:"flex",padding:"16px 24px",gap:8,borderBottom:`1px solid ${C.borda}`}}>
          {etapas.map((e,i)=>(
            <button key={i} onClick={()=>setEtapa(i+1)} style={{
              flex:1,padding:"8px 4px",borderRadius:6,border:"none",cursor:"pointer",
              background: etapa===i+1 ? C.laranja : C.claro,
              color: etapa===i+1 ? C.branco : C.texto,
              fontSize:11,fontWeight:etapa===i+1?700:400,
            }}>{e.icone} {e.label}</button>
          ))}
        </div>

        <div style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:14}}>

          {/* ETAPA 1 — Identificação + IND 1 */}
          {etapa===1 && <>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div>
                <div style={{fontSize:11,color:C.texto,marginBottom:4}}>Mês de referência</div>
                <input type="text" value={form.mes} onChange={e=>set("mes",e.target.value)}
                  style={{width:"100%",background:C.claro,border:`1px solid ${C.borda}`,borderRadius:6,
                    padding:"9px 12px",color:C.branco,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
              </div>
              <div>
                <div style={{fontSize:11,color:C.texto,marginBottom:4}}>Mentor responsável</div>
                <select value={form.mentor} onChange={e=>set("mentor",e.target.value)}
                  style={{width:"100%",background:C.claro,border:`1px solid ${C.borda}`,borderRadius:6,
                    padding:"9px 12px",color:C.branco,fontSize:13,outline:"none",boxSizing:"border-box"}}>
                  <option value="">Selecione</option>
                  {MENTORES.map(m=><option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div>
              <div style={{fontSize:11,color:C.texto,marginBottom:4}}>Coordenador mentorado</div>
              <select value={form.coordenador} onChange={e=>set("coordenador",e.target.value)}
                style={{width:"100%",background:C.claro,border:`1px solid ${C.borda}`,borderRadius:6,
                  padding:"9px 12px",color:C.branco,fontSize:13,outline:"none",boxSizing:"border-box"}}>
                <option value="">Selecione</option>
                {COORDENADORES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{paddingTop:8,borderTop:`1px solid ${C.borda}`}}>
              <div style={{fontSize:11,color:C.laranja,fontWeight:700,marginBottom:12,letterSpacing:0.5}}>
                IND 1 — QUALIDADE DA MENTORIA
              </div>
              <div>
                <div style={{fontSize:11,color:C.texto,marginBottom:4}}>NPS da sessão (0–10)</div>
                <input type="number" min="0" max="10" value={form.nps}
                  onChange={e=>set("nps",e.target.value)}
                  style={{width:"100%",background:C.claro,border:`1px solid ${C.borda}`,borderRadius:6,
                    padding:"9px 12px",color:C.branco,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
              </div>
              <div style={{marginTop:12}}>
                <Toggle label="Sprint do mês concluída?" campo="sprintConcluida"/>
              </div>
            </div>
          </>}

          {/* ETAPA 2 — IND 2 */}
          {etapa===2 && <>
            <div style={{fontSize:11,color:C.laranja,fontWeight:700,letterSpacing:0.5}}>
              IND 2 — IMPACTO NA ROTINA DO COORDENADOR
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <Input label="Ações planejadas na sprint" campo="acoesPlaneadas" placeholder="Ex: 5"/>
              <Input label="Ações realizadas" campo="acoesRealizadas" placeholder="Ex: 4"/>
            </div>
            {form.acoesPlaneadas && form.acoesRealizadas && (
              <div style={{background:C.claro,borderRadius:6,padding:"10px 14px",
                fontSize:12,color:C.brancoSoft,textAlign:"center"}}>
                % Ações executadas:{" "}
                <strong style={{color:
                  Math.round((parseFloat(form.acoesRealizadas)/parseFloat(form.acoesPlaneadas))*100) >= METAS.acoes
                  ? C.verde : C.vermelho}}>
                  {Math.round((parseFloat(form.acoesRealizadas)/parseFloat(form.acoesPlaneadas))*100)}%
                </strong>
              </div>
            )}
            <div style={{fontSize:11,color:C.texto,marginBottom:-6}}>Rituais implementados no mês:</div>
            <Toggle label="1:1 Semanal" campo="rit1x1"/>
            <Toggle label="Reunião de Time" campo="ritReuniao"/>
            <Toggle label="Feedback Estruturado" campo="ritFeedback"/>
            <Toggle label="Planning/Alinhamento" campo="ritPlanning"/>
            <div style={{background:C.claro,borderRadius:6,padding:"10px 14px",fontSize:12,color:C.brancoSoft,textAlign:"center"}}>
              Total de rituais:{" "}
              <strong style={{color:
                [form.rit1x1,form.ritReuniao,form.ritFeedback,form.ritPlanning].filter(r=>r==="Sim").length >= METAS.rituais
                ? C.verde : C.vermelho}}>
                {[form.rit1x1,form.ritReuniao,form.ritFeedback,form.ritPlanning].filter(r=>r==="Sim").length}/4
              </strong>
            </div>
          </>}

          {/* ETAPA 3 — IND 3 */}
          {etapa===3 && <>
            <div style={{fontSize:11,color:C.laranja,fontWeight:700,letterSpacing:0.5}}>
              IND 3 — IMPACTO NOS TIMES
            </div>
            <Input label="Delegações efetivas no mês" campo="delegacoes" placeholder="Qtde de tarefas delegadas e concluídas"/>
            <div style={{background:C.claro,borderRadius:6,padding:"12px 14px"}}>
              <div style={{fontSize:11,color:C.texto,marginBottom:10}}>
                Percepção do Time — trimestral (1–5) · deixe vazio se não for o mês
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                <Input label="Liderança" campo="percLideranca" placeholder="1–5"/>
                <Input label="Comunicação" campo="percComunicacao" placeholder="1–5"/>
                <Input label="Suporte" campo="percSuportes" placeholder="1–5"/>
              </div>
            </div>
          </>}

          {/* ETAPA 4 — IND 4 */}
          {etapa===4 && <>
            <div style={{fontSize:11,color:C.laranja,fontWeight:700,letterSpacing:0.5}}>
              IND 4 — RESULTADO NO NEGÓCIO
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <Input label="Entregas no prazo (%)" campo="entregas" placeholder="Ex: 82"/>
              <Input label="Retrabalho (%)" campo="retrabalho" placeholder="Ex: 15"/>
              <Input label="Turnover (%)" campo="turnover" placeholder="Ex: 5"/>
              <Input label="Satisfação do cliente (1–5)" campo="satisfacao" placeholder="Ex: 4.2"/>
            </div>
            <div>
              <div style={{fontSize:11,color:C.texto,marginBottom:4}}>Observações da sessão</div>
              <textarea value={form.observacoes} onChange={e=>set("observacoes",e.target.value)}
                rows={3} placeholder="Pontos relevantes, sinais de atenção, conquistas..."
                style={{width:"100%",background:C.claro,border:`1px solid ${C.borda}`,borderRadius:6,
                  padding:"9px 12px",color:C.branco,fontSize:12,outline:"none",resize:"vertical",
                  boxSizing:"border-box",fontFamily:"inherit"}}/>
            </div>
          </>}
        </div>

        {/* Footer */}
        <div style={{padding:"16px 24px",borderTop:`1px solid ${C.borda}`,
          display:"flex",justifyContent:"space-between",gap:10,
          position:"sticky",bottom:0,background:C.escuro}}>
          <div style={{display:"flex",gap:8}}>
            {etapa>1 && <Btn variant="ghost" onClick={()=>setEtapa(e=>e-1)}>← Voltar</Btn>}
          </div>
          <div style={{display:"flex",gap:8}}>
            <Btn variant="ghost" onClick={onCancelar}>Cancelar</Btn>
            {etapa<4
              ? <Btn onClick={()=>setEtapa(e=>e+1)}>Próximo →</Btn>
              : <Btn onClick={handleSalvar} disabled={salvando} variant="primary" size="lg">
                  {salvando ? "Salvando..." : "✅ Salvar Registro"}
                </Btn>
            }
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── ANÁLISE IA ───────────────────────────────────────────────────────────────
const AnaliseIA = ({ registros, mesRef }) => {
  const [analise, setAnalise] = useState("");
  const [loading, setLoading] = useState(false);
  const [aberto, setAberto] = useState(false);

  const gerarAnalise = async () => {
    if (!registros.length) return;
    setLoading(true);
    setAberto(true);
    setAnalise("");

    const resumo = registros.map(r => ({
      coordenador: r.coordenador,
      nps: r.nps,
      sprintConcluida: r.sprintConcluida,
      acoesPct: r.acoesPct,
      rituais: r.totalRituais,
      delegacoes: r.delegacoes,
      entregas: r.entregas,
      turnover: r.turnover,
      satisfacao: r.satisfacao,
      obs: r.observacoes,
    }));

    const npsM = avg(registros,"nps");
    const acoesM = avg(registros,"acoesPct");
    const entregasM = avg(registros,"entregas");
    const turnoverM = avg(registros,"turnover");

    const prompt = `Você é um consultor sênior de desenvolvimento de lideranças. Analise os dados do Programa Zellíder da Zello Tecnologia e gere um relatório executivo em português para o board.

MÊS DE REFERÊNCIA: ${mesRef}
TOTAL DE COORDENADORES: ${registros.length}

CONSOLIDADO:
- NPS Médio: ${npsM} (meta ≥ 8)
- % Ações Executadas: ${acoesM}% (meta ≥ 75%)
- Entregas no Prazo: ${entregasM}% (meta ≥ 85%)
- Turnover Médio: ${turnoverM}% (meta ≤ 8%)

DADOS INDIVIDUAIS:
${JSON.stringify(resumo, null, 2)}

Gere um relatório executivo com:
1. **SÍNTESE DO MÊS** (2-3 frases com o panorama geral)
2. **DESTAQUES POSITIVOS** (3 pontos concretos com nomes)
3. **PONTOS DE ATENÇÃO** (máximo 3, com nome e situação específica)
4. **RECOMENDAÇÃO ESTRATÉGICA** (1 ação prioritária para o próximo ciclo)
5. **MENSAGEM PARA O BOARD** (1 parágrafo de 3-4 linhas conectando desenvolvimento com resultado de negócio)

Seja direto, executivo e baseado nos dados. Use linguagem de negócio, não de RH. Evite clichês.`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      const texto = data.content?.map(b => b.text||"").join("") || "Erro ao gerar análise.";
      setAnalise(texto);
    } catch(e) {
      setAnalise("Erro ao conectar com a IA. Tente novamente.");
    }
    setLoading(false);
  };

  const renderTexto = (txt) => txt.split("\n").map((linha, i) => {
    if (!linha.trim()) return <div key={i} style={{height:8}}/>;
    const bold = linha.replace(/\*\*(.*?)\*\*/g, (_, t) => `<strong style="color:#E8531A">${t}</strong>`);
    return <div key={i} style={{fontSize:13,color:C.brancoSoft,lineHeight:1.8,marginBottom:2}}
      dangerouslySetInnerHTML={{__html: bold}}/>;
  });

  return (
    <div>
      <div style={{display:"flex",gap:10,alignItems:"center",marginBottom: aberto?16:0}}>
        <Btn onClick={gerarAnalise} disabled={loading||!registros.length} variant="primary">
          {loading ? "⏳ Analisando..." : "✨ Gerar Análise com IA"}
        </Btn>
        {aberto && <Btn variant="ghost" size="sm" onClick={()=>setAberto(false)}>Fechar</Btn>}
        {!registros.length && <span style={{fontSize:11,color:C.texto}}>Adicione registros primeiro</span>}
      </div>

      {aberto && (
        <Card style={{borderColor: C.laranja+"40", borderTop:`3px solid ${C.laranja}`}}>
          {loading ? (
            <div style={{textAlign:"center",padding:"30px 0"}}>
              <div style={{fontSize:13,color:C.texto,marginBottom:8}}>Analisando {registros.length} coordenadores...</div>
              <div style={{fontSize:11,color:C.sub}}>A IA está cruzando os dados e gerando insights estratégicos</div>
            </div>
          ) : (
            <>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <div style={{fontSize:12,fontWeight:800,color:C.laranja,textTransform:"uppercase",letterSpacing:1}}>
                  ✨ Análise Estratégica — {mesRef}
                </div>
                <Btn size="sm" variant="ghost" onClick={gerarAnalise}>↻ Regenerar</Btn>
              </div>
              <div>{renderTexto(analise)}</div>
            </>
          )}
        </Card>
      )}
    </div>
  );
};

// ─── APP PRINCIPAL ─────────────────────────────────────────────────────────────
export default function App() {
  const [registros, setRegistros] = useState([]);
  const [aba, setAba] = useState("dashboard");
  const [showForm, setShowForm] = useState(false);
  const [filtroMes, setFiltroMes] = useState("todos");
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    carregar().then(d => {
      setRegistros(d);
      setCarregado(true);
    });
  }, []);

  const salvarRegistro = useCallback((novo) => {
    setRegistros(prev => {
      const atualizado = [...prev, novo];
      salvar(atualizado);
      return atualizado;
    });
    setShowForm(false);
    setAba("dashboard");
  }, []);

  const deletar = (id) => {
    if (!confirm("Remover este registro?")) return;
    setRegistros(prev => {
      const atualizado = prev.filter(r=>r.id!==id);
      salvar(atualizado);
      return atualizado;
    });
  };

  const mesesDisponiveis = [...new Set(registros.map(r=>r.mes))].filter(Boolean);
  const regFiltrados = filtroMes === "todos" ? registros : registros.filter(r=>r.mes===filtroMes);
  const mesRef = filtroMes !== "todos" ? filtroMes : (mesesDisponiveis[mesesDisponiveis.length-1] || mesAtual());

  const npsM = avg(regFiltrados,"nps");
  const acoesM = avg(regFiltrados,"acoesPct");
  const rituaisM = avg(regFiltrados,"totalRituais");
  const delegTot = regFiltrados.reduce((a,r)=>a+(parseFloat(r.delegacoes)||0),0);
  const percM = avg(regFiltrados.filter(r=>r.percLideranca), "percLideranca");
  const entregasM = avg(regFiltrados,"entregas");
  const satisfM = avg(regFiltrados,"satisfacao");
  const turnoverM = avg(regFiltrados,"turnover");
  const sprintsM = pct(regFiltrados,"sprintConcluida");

  const atenção = regFiltrados.filter(r =>
    parseFloat(r.nps) < METAS.nps ||
    parseFloat(r.acoesPct) < METAS.acoes ||
    r.totalRituais < METAS.rituais
  );

  const dadosGrafico = [...registros]
    .filter(r=>r.coordenador)
    .reduce((acc,r) => {
      const ex = acc.find(a=>a.nome===r.coordenador);
      if (ex) { ex.nps = parseFloat(r.nps)||ex.nps; }
      else acc.push({nome:r.coordenador.split(" ")[0], nps:parseFloat(r.nps)||0});
      return acc;
    },[])
    .sort((a,b)=>b.nps-a.nps);

  const abas = [
    {id:"dashboard", label:"📊 Dashboard"},
    {id:"registros", label:`📝 Registros (${registros.length})`},
    {id:"atencao", label:`⚠️ Atenção (${atenção.length})`},
    {id:"ia", label:"✨ Análise IA"},
  ];

  if (!carregado) return (
    <div style={{background:C.preto,minHeight:"100vh",display:"flex",alignItems:"center",
      justifyContent:"center",color:C.texto,fontSize:14}}>
      Carregando...
    </div>
  );

  return (
    <div style={{background:C.preto,minHeight:"100vh",fontFamily:"'Helvetica Neue',Arial,sans-serif",color:C.branco}}>

      {/* HEADER */}
      <div style={{background:C.escuro,borderBottom:`1px solid ${C.borda}`,padding:"16px 32px",
        display:"flex",justifyContent:"space-between",alignItems:"center",
        position:"sticky",top:0,zIndex:50}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:36,height:36,background:C.laranja,borderRadius:8,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:16,fontWeight:900,color:C.branco}}>Z</div>
          <div>
            <div style={{fontSize:16,fontWeight:800,letterSpacing:-0.5}}>
              Zellíder <span style={{color:C.laranja}}>Dashboard</span>
            </div>
            <div style={{fontSize:10,color:C.texto}}>Programa de Mentoria · Zello Tecnologia</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {mesesDisponiveis.length > 0 && (
            <select value={filtroMes} onChange={e=>setFiltroMes(e.target.value)}
              style={{background:C.claro,border:`1px solid ${C.borda}`,borderRadius:6,
                padding:"7px 12px",color:C.branco,fontSize:12,outline:"none"}}>
              <option value="todos">Todos os meses</option>
              {mesesDisponiveis.map(m=><option key={m} value={m}>{m}</option>)}
            </select>
          )}
          <Btn onClick={()=>setShowForm(true)} variant="primary">+ Novo Registro</Btn>
        </div>
      </div>

      {/* ABAS */}
      <div style={{display:"flex",gap:2,padding:"0 32px",borderBottom:`1px solid ${C.borda}`,background:C.escuro}}>
        {abas.map(a=>(
          <button key={a.id} onClick={()=>setAba(a.id)} style={{
            background: aba===a.id ? C.laranja : "transparent",
            color: aba===a.id ? C.branco : C.texto,
            border:"none",borderRadius:"6px 6px 0 0",
            padding:"10px 18px",fontSize:12,fontWeight:aba===a.id?700:400,cursor:"pointer",
          }}>{a.label}</button>
        ))}
      </div>

      <div style={{padding:"28px 32px"}}>

        {/* SEM DADOS */}
        {registros.length===0 && aba==="dashboard" && (
          <div style={{textAlign:"center",padding:"60px 20px"}}>
            <div style={{fontSize:40,marginBottom:16}}>📋</div>
            <div style={{fontSize:18,fontWeight:700,color:C.branco,marginBottom:8}}>
              Nenhum registro ainda
            </div>
            <div style={{fontSize:13,color:C.texto,marginBottom:24,maxWidth:400,margin:"0 auto 24px"}}>
              Comece registrando a primeira sessão de mentoria. O dashboard e a análise de IA aparecem automaticamente.
            </div>
            <Btn onClick={()=>setShowForm(true)} variant="primary" size="lg">
              + Registrar Primeira Mentoria
            </Btn>
          </div>
        )}

        {/* DASHBOARD */}
        {aba==="dashboard" && registros.length>0 && (
          <>
            {/* Cadeia de valor */}
            <div style={{background:C.medio,border:`1px solid ${C.borda}`,borderRadius:8,
              padding:"14px 20px",marginBottom:28,display:"flex",alignItems:"center",flexWrap:"wrap",gap:0}}>
              {[
                {label:"IND 1",desc:"Qualidade da Mentoria",val:`NPS ${npsM}`,s:st(npsM,METAS.nps)},
                {seta:true},
                {label:"IND 2",desc:"Mudança de Comportamento",val:`${acoesM}% ações`,s:st(acoesM,METAS.acoes)},
                {seta:true},
                {label:"IND 3",desc:"Impacto no Time",val:`${delegTot} delegações`,s:st(delegTot,METAS.delegacoes*regFiltrados.length)},
                {seta:true},
                {label:"IND 4",desc:"Resultado no Negócio",val:`${entregasM}% entregas`,s:st(entregasM,METAS.entregas)},
              ].map((item,i)=>item.seta ? (
                <span key={i} style={{color:C.laranja,fontSize:18,padding:"0 12px"}}>→</span>
              ):(
                <div key={i} style={{flex:1,minWidth:120}}>
                  <div style={{fontSize:9,color:C.texto,letterSpacing:1,textTransform:"uppercase",fontFamily:"monospace"}}>{item.label}</div>
                  <div style={{fontSize:11,color:C.sub,marginBottom:2}}>{item.desc}</div>
                  <div style={{fontSize:14,fontWeight:800,color:cor(item.s)}}>{item.val}</div>
                </div>
              ))}
            </div>

            <Secao titulo="IND 1 — Qualidade das Mentorias">
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <KPI titulo="NPS Médio" valor={npsM} meta={METAS.nps} unidade="/10"/>
                <KPI titulo="Sprints Concluídas" valor={sprintsM} meta={METAS.sprints} unidade="%"/>
              </div>
            </Secao>

            <Secao titulo="IND 2 — Impacto na Rotina">
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <KPI titulo="% Ações Executadas" valor={acoesM} meta={METAS.acoes} unidade="%"/>
                <KPI titulo="Média de Rituais" valor={rituaisM} meta={METAS.rituais} unidade="/4"/>
              </div>
            </Secao>

            <Secao titulo="IND 3 — Impacto nos Times">
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <KPI titulo="Total de Delegações Efetivas" valor={delegTot} meta={METAS.delegacoes*regFiltrados.length} unidade=" deleg."/>
                <KPI titulo="Percepção Média do Time" valor={percM||"—"} meta={METAS.percTime} unidade="/5" descricao="Trimestral"/>
              </div>
            </Secao>

            <Secao titulo="IND 4 — Resultado no Negócio">
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
                <KPI titulo="Entregas no Prazo" valor={entregasM} meta={METAS.entregas} unidade="%"/>
                <KPI titulo="Satisfação do Cliente" valor={satisfM} meta={METAS.satisfacao} unidade="/5"/>
                <KPI titulo="Turnover Médio" valor={turnoverM} meta={METAS.turnover} unidade="%" inv/>
              </div>
            </Secao>

            {dadosGrafico.length>0 && (
              <Secao titulo="NPS por Coordenador">
                <Card style={{padding:"16px 8px"}}>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={dadosGrafico} margin={{top:0,right:16,left:-16,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.borda} vertical={false}/>
                      <XAxis dataKey="nome" tick={{fill:C.texto,fontSize:10}} axisLine={false} tickLine={false}/>
                      <YAxis domain={[0,10]} tick={{fill:C.texto,fontSize:10}} axisLine={false} tickLine={false}/>
                      <Tooltip content={<Tip/>}/>
                      <Bar dataKey="nps" name="NPS" radius={[4,4,0,0]}>
                        {dadosGrafico.map((d,i)=>(
                          <Cell key={i} fill={d.nps>=METAS.nps?C.laranja:C.claro}/>
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </Secao>
            )}
          </>
        )}

        {/* REGISTROS */}
        {aba==="registros" && (
          <Secao titulo="Todos os Registros" sub={`${registros.length} sessões registradas`}
            action={<Btn onClick={()=>setShowForm(true)} size="sm">+ Novo</Btn>}>
            {registros.length===0 ? (
              <div style={{textAlign:"center",padding:40,color:C.texto}}>Nenhum registro ainda.</div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {[...registros].reverse().map(r=>(
                  <Card key={r.id} style={{padding:"14px 18px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                      <div style={{display:"flex",gap:10,alignItems:"center"}}>
                        <span style={{fontWeight:800,color:C.branco,fontSize:14}}>{r.coordenador}</span>
                        <span style={{fontSize:11,color:C.texto,background:C.claro,padding:"2px 8px",borderRadius:4}}>{r.mes}</span>
                        <span style={{fontSize:11,color:C.sub}}>por {r.mentor||"—"}</span>
                      </div>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <span style={{fontSize:11,color:C.sub}}>{r.dataRegistro}</span>
                        <button onClick={()=>deletar(r.id)} style={{background:"none",border:"none",
                          color:C.sub,cursor:"pointer",fontSize:14,padding:"2px 6px"}}>🗑</button>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      {[
                        {l:"NPS",v:r.nps,s:st(parseFloat(r.nps),METAS.nps)},
                        {l:"Sprint",v:r.sprintConcluida,s:r.sprintConcluida==="Sim"?"ok":"al"},
                        {l:"Ações",v:(r.acoesPct||"—")+"%",s:st(parseFloat(r.acoesPct),METAS.acoes)},
                        {l:"Rituais",v:(r.totalRituais||"—")+"/4",s:st(r.totalRituais,METAS.rituais)},
                        {l:"Entregas",v:(r.entregas||"—")+"%",s:st(parseFloat(r.entregas),METAS.entregas)},
                        {l:"Turnover",v:(r.turnover||"—")+"%",s:st(parseFloat(r.turnover),METAS.turnover,true)},
                      ].map((tag,j)=>(
                        <span key={j} style={{
                          fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:4,
                          background:`${cor(tag.s)}15`,color:cor(tag.s),border:`1px solid ${cor(tag.s)}30`,
                        }}>{tag.l}: {tag.v}</span>
                      ))}
                    </div>
                    {r.observacoes && <div style={{fontSize:11,color:C.sub,marginTop:8,fontStyle:"italic"}}>"{r.observacoes}"</div>}
                  </Card>
                ))}
              </div>
            )}
          </Secao>
        )}

        {/* ATENÇÃO */}
        {aba==="atencao" && (
          <Secao titulo={`${atenção.length} Coordenadores Requerem Atenção`} sub="Abaixo da meta em pelo menos um indicador — sprint cirúrgica recomendada">
            {atenção.length===0 ? (
              <div style={{textAlign:"center",padding:60,color:C.verde,fontSize:18,fontWeight:700}}>
                ✅ Todos os coordenadores estão dentro das metas!
              </div>
            ):atenção.map((r,i)=>{
              const gaps = [
                parseFloat(r.nps)<METAS.nps && {l:"NPS",v:`${r.nps} (meta ≥${METAS.nps})`,a:"Aprofundar rapport e adequar metodologia"},
                parseFloat(r.acoesPct)<METAS.acoes && {l:"Ações",v:`${r.acoesPct}% (meta ≥${METAS.acoes}%)`,a:"Sprint focada em priorização e remoção de impedimentos"},
                r.totalRituais<METAS.rituais && {l:"Rituais",v:`${r.totalRituais}/4 (meta ≥${METAS.rituais})`,a:"Implementar o rito faltante com acompanhamento semanal"},
              ].filter(Boolean);
              return (
                <Card key={i} style={{marginBottom:12,borderLeft:`4px solid ${C.vermelho}`,borderColor:C.vermelho+"40"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:12,alignItems:"center"}}>
                    <span style={{fontSize:15,fontWeight:800,color:C.branco}}>{r.coordenador}</span>
                    <span style={{fontSize:11,color:C.sub}}>{r.mes}</span>
                  </div>
                  {gaps.map((g,j)=>(
                    <div key={j} style={{background:C.claro,borderRadius:6,padding:"10px 14px",marginBottom:8}}>
                      <div style={{fontSize:11,color:C.vermelho,fontWeight:700,marginBottom:3}}>🔴 {g.l}: {g.v}</div>
                      <div style={{fontSize:12,color:C.brancoSoft}}>→ {g.a}</div>
                    </div>
                  ))}
                  {r.observacoes && <div style={{fontSize:11,color:C.sub,marginTop:8,fontStyle:"italic"}}>Obs: "{r.observacoes}"</div>}
                </Card>
              );
            })}
          </Secao>
        )}

        {/* IA */}
        {aba==="ia" && (
          <Secao titulo="Análise Estratégica com IA" sub="Gera relatório executivo automático baseado nos dados registrados">
            <Card style={{marginBottom:20}}>
              <div style={{fontSize:12,color:C.texto,lineHeight:1.8,marginBottom:16}}>
                A IA analisa todos os registros do período selecionado e gera um relatório estratégico pronto para o board — com destaques, alertas e recomendação de ação prioritária.
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
                {["Síntese executiva","Destaques por nome","Pontos de atenção","Recomendação estratégica","Mensagem para o board"].map((f,i)=>(
                  <span key={i} style={{fontSize:11,background:C.claro,color:C.texto,
                    padding:"4px 10px",borderRadius:4,border:`1px solid ${C.borda}`}}>✓ {f}</span>
                ))}
              </div>
              <AnaliseIA registros={regFiltrados} mesRef={mesRef}/>
            </Card>
          </Secao>
        )}
      </div>

      {/* FORMULÁRIO */}
      {showForm && <Formulario onSalvar={salvarRegistro} onCancelar={()=>setShowForm(false)}/>}

      {/* RODAPÉ */}
      <div style={{margin:"0 32px",padding:"16px 0",borderTop:`1px solid ${C.borda}`,
        display:"flex",justifyContent:"space-between",fontSize:11,color:C.sub}}>
        <span>Zellíder · Mentoria de Lideranças · Zello Tecnologia</span>
        <span>Mentores: Eduardo Zanini / Cris · {registros.length} registros salvos</span>
      </div>
    </div>
  );
}
