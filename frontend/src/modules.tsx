import React, { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import type { Language } from "./i18n";

type Row = Record<string, any>;

const money = (v: any) => Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const label = (lang: Language, en: string, hi: string) => lang === "hi" ? hi : en;
const localized = (lang: Language, r: Row, enKey="nameEn", hiKey="nameHi", fallbackKey="name") => r[lang === "hi" ? hiKey : enKey] || r[enKey] || r[hiKey] || r[fallbackKey] || "";

async function request(path: string, method="GET", body?: any) {
  const fn = (api as any).request;
  if (fn) return fn(path, method, body);
  const base = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api") + path;
  const token = localStorage.getItem("canteen_token") || localStorage.getItem("token");
  const response = await fetch(base, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`);
  return data;
}

const endpoints: Record<string,string> = {
  departments: "/departments",
  parties: "/parties",
  persons: "/persons",
  categories: "/food-categories",
  "food-items": "/food-items",
  units: "/units",
  suppliers: "/suppliers",
  rates: "/rates",
  sale: "/sales",
  purchase: "/purchases",
  payment: "/payments",
  inventory: "/inventory/stock",
  wastage: "/inventory/wastage",
  ledger: "/reports/outstanding",
  "expenses-entry": "/expenses",
  bulk: "/sales/bulk"
};

function Card({children}: {children: React.ReactNode}) { return <div className="module-card">{children}</div>; }
function Header({title,lang,action}:{title:string;lang:Language;action?:React.ReactNode}) { return <div className="page-heading"><div><h2>{title}</h2></div>{action}</div>; }

function SearchableSelect({value,onChange,options,placeholder}:{value:any;onChange:(value:string)=>void;options:{id:any;label:string}[];placeholder:string}) {
  const selected=options.find(o=>String(o.id)===String(value));
  const [query,setQuery]=useState(selected?.label||"");
  useEffect(()=>{setQuery(selected?.label||"");},[value,selected?.label]);
  const [listId] = useState(() => `search-${Math.random().toString(36).slice(2,10)}`);
  return <div className="searchable-select">
    <input list={listId} value={query} placeholder={placeholder} onChange={e=>{
      const text=e.target.value;
      setQuery(text);
      const exact=options.find(o=>o.label.toLocaleLowerCase()===text.toLocaleLowerCase());
      if(exact) onChange(String(exact.id));
      else if(!text) onChange("");
    }} />
    <datalist id={listId}>{options.map(o=><option key={String(o.id)} value={o.label}/>)}</datalist>
  </div>;
}

function MasterPage({module,lang}:{module:string;lang:Language}) {
  const [rows,setRows]=useState<Row[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [editing,setEditing]=useState<Row|null>(null);
  const [show,setShow]=useState(false);
  const [search,setSearch]=useState("");
  const [form,setForm]=useState<Row>({});
  const [masters,setMasters]=useState<Record<string,Row[]>>({});

  const titleMap:Record<string,[string,string]>= {
    departments:["Departments","विभाग"], parties:["Party Accounts","पार्टी खाते"], persons:["Persons / Employees","व्यक्ति / कर्मचारी"], categories:["Food Categories","खाद्य श्रेणियां"], "food-items":["Food Items","खाद्य सामग्री"], units:["Units","इकाई"], suppliers:["Suppliers","आपूर्तिकर्ता"], rates:["Rate Master","रेट मास्टर"]
  };
  const title=label(lang,...titleMap[module]);
  const endpoint=endpoints[module];

  const load=async()=>{
    setLoading(true); setError("");
    try {
      const r=await request(`${endpoint}${search?`?search=${encodeURIComponent(search)}`:""}`);
      setRows(Array.isArray(r.data)?r.data:[]);
    } catch(e) {
      setError(e instanceof Error?e.message:"Unable to load");
    } finally { setLoading(false); }
  };

  const loadMasters=async()=>{
    try {
      const needs = new Set<string>();
      if(module === "parties" || module === "persons" || module === "bulk") needs.add("departments");
      if(module === "persons") needs.add("parties");
      if(module === "food-items") { needs.add("categories"); needs.add("units"); }
      if(module === "rates") needs.add("food-items");
      const entries=await Promise.all([...needs].map(async key=>[key,(await request(endpoints[key])).data||[]] as const));
      setMasters(Object.fromEntries(entries));
    } catch(e) {
      setError(e instanceof Error?e.message:"Unable to load master data");
    }
  };

  useEffect(()=>{ void load(); },[module]);
  useEffect(()=>{ if(show) void loadMasters(); },[show,module]);

  const fields=useMemo(()=>{
    if(module==="departments")return [["code","Code"],["nameEn","Name (English)"],["nameHi","Name (Hindi)"],["descriptionEn","Description (English)"],["descriptionHi","Description (Hindi)"]];
    if(module==="parties")return [["partyCode","Party Code"],["partyNameEn","Party Name (English)"],["partyNameHi","Party Name (Hindi)"],["partyType","Party Type"],["departmentId","Department"],["mobile","Mobile"],["email","Email"],["address","Address"],["openingBalance","Opening Balance"]];
    if(module==="persons")return [["employeeCode","Employee Code"],["nameEn","Name (English)"],["nameHi","Name (Hindi)"],["gender","Gender"],["partyId","Party"],["departmentId","Department"],["mobile","Mobile"],["email","Email"]];
    if(module==="categories")return [["nameEn","Name (English)"],["nameHi","Name (Hindi)"],["descriptionEn","Description (English)"],["descriptionHi","Description (Hindi)"]];
    if(module==="units")return [["nameEn","Name (English)"],["nameHi","Name (Hindi)"],["shortName","Short Name"]];
    if(module==="suppliers")return [["supplierCode","Supplier Code"],["nameEn","Name (English)"],["nameHi","Name (Hindi)"],["addressEn","Address (English)"],["addressHi","Address (Hindi)"],["mobile","Mobile"],["email","Email"],["gstNo","GST No"]];
    if(module==="rates")return [["foodItemId","Food Item"],["rate","Rate"],["effectiveFrom","Effective From"],["effectiveTo","Effective To"]];
    return [["itemCode","Item Code"],["nameEn","Name (English)"],["nameHi","Name (Hindi)"],["categoryId","Category"],["unitId","Unit"],["purchaseRate","Purchase Rate"],["saleRate","Sale Rate"],["minimumStock","Minimum Stock"],["maximumStock","Maximum Stock"]];
  },[module]);

  const tableFields=useMemo(()=>{
    if(module==="departments") return ["code","nameEn","descriptionEn"];
    if(module==="parties") return ["partyCode","partyNameEn","partyType","departmentId","mobile"];
    if(module==="persons") return ["employeeCode","nameEn","gender","partyId","departmentId"];
    if(module==="categories") return ["nameEn","descriptionEn"];
    if(module==="units") return ["nameEn","shortName"];
    if(module==="suppliers") return ["supplierCode","nameEn","mobile","email"];
    if(module==="rates") return ["foodItemId","rate","effectiveFrom"];
    return ["itemCode","nameEn","categoryId","unitId","saleRate"];
  },[module]);

  const setField=(key:string,value:any)=>setForm((prev)=>({...prev,[key]:value}));

  const save=async()=>{
    setError("");
    try {
      const payload={...form};
      if(payload.nameEn && !payload.name) payload.name=payload.nameEn;
      if(payload.partyNameEn && !payload.partyName) payload.partyName=payload.partyNameEn;
      if(payload.nameEn && module==="units" && !payload.name) payload.name=payload.nameEn;
      const method=editing ? "PUT" : "POST";
      await request(editing?`${endpoint}/${editing.id}`:endpoint,method,payload);
      setShow(false); setEditing(null); setForm({});
      await load();
    } catch(e) { setError(e instanceof Error?e.message:"Save failed"); }
  };

  const edit=(r:Row)=>{
    setEditing(r); setForm({...r}); setShow(true);
  };

  const openNew=()=>{setEditing(null);setForm({});setError("");setShow(true);};

  const localizedColumn=(r:Row,key:string)=>{
    if(key==="nameEn" || key==="nameHi") return localized(lang,r,"nameEn","nameHi","name");
    if(key==="partyNameEn" || key==="partyNameHi") return localized(lang,r,"partyNameEn","partyNameHi","partyName");
    if(key==="descriptionEn" || key==="descriptionHi") return localized(lang,r,"descriptionEn","descriptionHi","description");
    if(key==="addressEn" || key==="addressHi") return localized(lang,r,"addressEn","addressHi","address");
    return String(r[key]??"");
  };

  const displayValue=(r:Row,key:string)=>{
    if(key.endsWith("Id")) {
      const masterKey=key==="departmentId"?"departments":key==="partyId"?"parties":key==="categoryId"?"categories":key==="unitId"?"units":key==="foodItemId"?"food-items":"";
      const match=masters[masterKey]?.find(x=>Number(x.id)===Number(r[key]));
      if(match) return masterKey==="parties"?localized(lang,match,"partyNameEn","partyNameHi","partyName"):localized(lang,match,"nameEn","nameHi","name");
    }
    return localizedColumn(r,key);
  };

  const input=(key:string,l:string)=>{
    const numeric=key.toLowerCase().includes("rate")||key.toLowerCase().includes("balance")||key.toLowerCase().includes("stock")||key==="departmentId"||key==="partyId"||key==="categoryId"||key==="unitId"||key==="foodItemId";
    const type=key==="effectiveFrom"||key==="effectiveTo"?"date":numeric?"number":"text";
    if(key==="partyType") return <SearchableSelect value={form[key]??""} onChange={v=>setField(key,v)} options={["EMPLOYEE","DEPARTMENT","CONTRACTOR","GUEST","OTHER"].map(x=>({id:x,label:x}))} placeholder={label(lang,"Select Party Type","पार्टी प्रकार चुनें")}/>;
    if(key==="gender") return <SearchableSelect value={form[key]??""} onChange={v=>setField(key,v||null)} options={["MALE","FEMALE","OTHER"].map(x=>({id:x,label:x}))} placeholder={label(lang,"Select Gender","लिंग चुनें")}/>;
    const masterKey=key==="departmentId"?"departments":key==="partyId"?"parties":key==="categoryId"?"categories":key==="unitId"?"units":key==="foodItemId"?"food-items":"";
    if(masterKey) return <SearchableSelect value={form[key]??""} onChange={v=>setField(key,v?Number(v):null)} options={(masters[masterKey]||[]).map(x=>({id:x.id,label:masterKey==="parties"?localized(lang,x,"partyNameEn","partyNameHi","partyName"):localized(lang,x,"nameEn","nameHi","name")}))} placeholder={label(lang,`Select ${l}`,`चुनें`)}/>;
    return <input type={type} value={form[key]??""} onChange={e=>setField(key,e.target.value)} />;
  };

  return <>
    <Header title={title} lang={lang} action={<button className="primary-btn" onClick={openNew}>＋ {label(lang,"Add New","नया जोड़ें")}</button>}/>
    {error&&<div className="alert error">{error}</div>}
    <Card><div className="toolbar"><input placeholder={label(lang,"Search","खोजें")} value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==="Enter"&&void load()}/><button className="secondary-btn" onClick={()=>void load()}>↻ {label(lang,"Refresh","रिफ्रेश")}</button></div>
      {loading?<div className="loading">Loading...</div>:<div className="table-wrap"><table><thead><tr>
        {tableFields.map((key)=>{ const field=fields.find(([fieldKey])=>fieldKey===key); const labelText=field?.[1]||key; return <th key={key}>{labelText.replace(" (English)","").replace(" (Hindi","")}</th>; })}<th>Action</th>
      </tr></thead><tbody>{rows.map(r=><tr key={r.id}>{tableFields.map((key)=><td key={key}>{displayValue(r,key)}</td>)}<td><button className="secondary-btn" onClick={()=>edit(r)}>Edit</button></td></tr>)}</tbody></table></div>}
    </Card>
    {show&&<div className="modal-backdrop"><div className="modal-card"><div className="page-heading"><h3>{editing?label(lang,"Edit","संपादित करें"):label(lang,"Add New","नया जोड़ें")} — {title}</h3><button className="icon-btn" onClick={()=>setShow(false)}>✕</button></div><div className="form-grid">{fields.map(([key,l])=><div className="field" key={key}><label>{l}</label>{input(key,l)}</div>)}</div><div className="modal-actions"><button className="secondary-btn" onClick={()=>setShow(false)}>Cancel</button><button className="primary-btn" onClick={()=>void save()}>Save</button></div></div></div>}
  </>;
}

function SalePage({lang}:{lang:Language}) {
  const [items,setItems]=useState<Row[]>([]);const [parties,setParties]=useState<Row[]>([]);const [persons,setPersons]=useState<Row[]>([]);const [rows,setRows]=useState<Row[]>([]);const [partyId,setPartyId]=useState("");const [personId,setPersonId]=useState("");const [saleType,setSaleType]=useState("INDIVIDUAL");const [paymentMode,setPaymentMode]=useState("CASH");const [paid,setPaid]=useState("");const [error,setError]=useState("");const [savedSale,setSavedSale]=useState<Row|null>(null);
  const load=async()=>{try{const [i,p,pe]=await Promise.all([request("/food-items"),request("/parties"),request("/persons")]);setItems(i.data||[]);setParties(p.data||[]);setPersons(pe.data||[]);}catch(e){setError(e instanceof Error?e.message:"Unable to load masters");}};useEffect(()=>{void load()},[]);
  const add=()=>setRows([...rows,{foodItemId:items[0]?.id||"",quantity:1,rate:Number(items[0]?.saleRate||0)}]); const total=rows.reduce((s,r)=>s+Number(r.quantity||0)*Number(r.rate||0),0); const due=Math.max(0,total-Number(paid||0));
  const post=async()=>{try{setError("");if(!rows.length)throw new Error("Add at least one food item.");if(!partyId)throw new Error("Party is required for sale posting.");const payload={saleType,partyId:Number(partyId),personId:personId?Number(personId):null,paymentMode,paidAmount:Number(paid||0),items:rows.map(r=>({foodItemId:Number(r.foodItemId),quantity:Number(r.quantity),rate:Number(r.rate)})),notes:""};const result=await request("/sales","POST",payload);setSavedSale(result.data||null);setRows([]);setPaid("");}catch(e){setError(e instanceof Error?e.message:"Sale failed");}};
  const print=()=>window.print();
  return <><Header title={label(lang,"New Sale / Billing","नई बिक्री / बिलिंग")} lang={lang}/>{error&&<div className="alert error">{error}</div>}
    <Card><div className="form-grid"><div className="field"><label>Sale Type</label><SearchableSelect value={saleType} onChange={setSaleType} options={["INDIVIDUAL","DEPARTMENT","COUNTER","BULK"].map(x=>({id:x,label:x}))} placeholder="Select Sale Type"/></div><div className="field"><label>Party</label><SearchableSelect value={partyId} onChange={setPartyId} options={parties.map(p=>({id:p.id,label:localized(lang,p,"partyNameEn","partyNameHi","partyName")}))} placeholder={label(lang,"Search Party","पार्टी खोजें")}/></div><div className="field"><label>Person</label><SearchableSelect value={personId} onChange={setPersonId} options={persons.map(p=>({id:p.id,label:localized(lang,p,"nameEn","nameHi","name")}))} placeholder={label(lang,"Search Person","व्यक्ति खोजें")}/></div></div></Card>
    <Card><div className="toolbar"><strong>{label(lang,"Sale Items","बिक्री सामग्री")}</strong></div><div className="table-wrap"><table><thead><tr><th>Food Item</th><th>Qty</th><th>Rate</th><th>Amount</th><th></th></tr></thead><tbody>{rows.map((r,i)=><tr key={i}><td><SearchableSelect value={r.foodItemId} onChange={v=>{const a=[...rows];const id=Number(v);a[i]={...a[i],foodItemId:id,rate:Number(items.find(x=>x.id===id)?.saleRate||0)};setRows(a)}} options={items.map(x=>({id:x.id,label:localized(lang,x,"nameEn","nameHi","name")}))} placeholder="Search Item"/></td><td><input type="number" min="0.001" step="0.001" value={r.quantity} onChange={e=>{const a=[...rows];a[i]={...a[i],quantity:e.target.value};setRows(a)}}/></td><td><input type="number" min="0" step="0.01" value={r.rate} onChange={e=>{const a=[...rows];a[i]={...a[i],rate:e.target.value};setRows(a)}}/></td><td>₹ {money(Number(r.quantity||0)*Number(r.rate||0))}</td><td><button className="danger-btn" onClick={()=>setRows(rows.filter((_,j)=>j!==i))}>✕</button></td></tr>)}</tbody></table></div><div className="form-actions"><button className="secondary-btn" onClick={add}>＋ Add Item</button></div><div className="total-box"><div>Subtotal: <strong>₹ {money(total)}</strong></div><div>Discount: <strong>₹ 0.00</strong></div><div>Grand Total: <strong>₹ {money(total)}</strong></div></div><div className="form-grid payment-after-table"><div className="field"><label>Paid Amount</label><input type="number" min="0" value={paid} onChange={e=>setPaid(e.target.value)}/></div><div className="field"><label>Payment Mode</label><SearchableSelect value={paymentMode} onChange={setPaymentMode} options={["CASH","UPI","CARD","BANK_TRANSFER","CHEQUE","OTHER"].map(x=>({id:x,label:x}))} placeholder="Search Payment Mode"/></div><div className="field"><label>Balance / Due</label><input value={money(due)} readOnly/></div></div><div className="form-actions"><button className="primary-btn" onClick={post}>✓ Save Sale</button></div></Card>
    {savedSale&&<div className="modal-backdrop"><div className="modal-card print-preview"><div className="page-heading"><h3>{label(lang,"Sale Saved Successfully","बिक्री सफलतापूर्वक सेव हुई")}</h3><button className="icon-btn no-print" onClick={()=>setSavedSale(null)}>✕</button></div><div className="print-document"><h2>VK Canteen</h2><p><strong>Bill No:</strong> {savedSale.invoiceNo}</p><p><strong>Date:</strong> {new Date(savedSale.saleDate).toLocaleString("en-IN")}</p><p><strong>Party:</strong> {localized(lang,savedSale.party||{},"partyNameEn","partyNameHi","partyName")}</p><table><thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>{(savedSale.items||[]).map((it:Row)=><tr key={it.id}><td>{localized(lang,it.foodItem||{},"nameEn","nameHi","name")}</td><td>{it.quantity}</td><td>₹ {money(it.rate)}</td><td>₹ {money(it.amount)}</td></tr>)}</tbody></table><div className="print-totals"><p>Discount: ₹ {money(savedSale.discount)}</p><p>Tax: ₹ {money(savedSale.tax)}</p><p>Total: ₹ {money(savedSale.grandTotal)}</p><p>Paid: ₹ {money(savedSale.paidAmount)}</p><p>Due: ₹ {money(savedSale.outstanding)}</p><p>Payment Mode: {savedSale.ledgerEntries?.find((e:Row)=>e.payment?.paymentMode)?.payment?.paymentMode || paymentMode}</p></div></div><div className="modal-actions no-print"><button className="secondary-btn" onClick={()=>setSavedSale(null)}>Close</button><button className="primary-btn" onClick={print}>🖨 Print</button></div></div></div>}
  </>;
}

function PaymentPage({lang}:{lang:Language}){const [parties,setParties]=useState<Row[]>([]);const [partyId,setPartyId]=useState("");const [amount,setAmount]=useState("");const [mode,setMode]=useState("CASH");const [ref,setRef]=useState("");const [remarks,setRemarks]=useState("");const [error,setError]=useState("");useEffect(()=>{request("/parties").then(r=>setParties(r.data||[])).catch(e=>setError(e.message))},[]);const save=async()=>{try{if(!partyId||Number(amount)<=0)throw new Error("Party and valid amount are required.");await request("/payments","POST",{partyId:Number(partyId),amount:Number(amount),paymentMode:mode,referenceNo:ref,remarks});alert("Payment posted successfully");setAmount("");setRef("");}catch(e){setError(e instanceof Error?e.message:"Payment failed")}};return <><Header title={label(lang,"Receive Payment","भुगतान प्राप्त करें")} lang={lang}/>{error&&<div className="alert error">{error}</div>}<Card><div className="form-grid"><div className="field"><label>Party</label><SearchableSelect value={partyId} onChange={setPartyId} options={parties.map(p=>({id:p.id,label:localized(lang,p,"partyNameEn","partyNameHi","partyName")}))} placeholder="Search Party"/></div><div className="field"><label>Amount</label><input type="number" min="0.01" value={amount} onChange={e=>setAmount(e.target.value)}/></div><div className="field"><label>Payment Mode</label><SearchableSelect value={mode} onChange={setMode} options={["CASH","UPI","CARD","BANK_TRANSFER","CHEQUE","OTHER"].map(x=>({id:x,label:x}))} placeholder="Search Payment Mode"/></div><div className="field"><label>Reference No</label><input value={ref} onChange={e=>setRef(e.target.value)}/></div><div className="field"><label>Remarks</label><input value={remarks} onChange={e=>setRemarks(e.target.value)}/></div></div><button className="primary-btn" onClick={save}>✓ Save Payment</button></Card></>}

function PurchasePage({lang}:{lang:Language}){const [suppliers,setSuppliers]=useState<Row[]>([]);const [items,setItems]=useState<Row[]>([]);const [supplierId,setSupplierId]=useState("");const [invoiceNo,setInvoiceNo]=useState("");const [rows,setRows]=useState<Row[]>([]);const [error,setError]=useState("");useEffect(()=>{Promise.all([request("/suppliers"),request("/food-items")]).then(([s,i])=>{setSuppliers(s.data||[]);setItems(i.data||[])}).catch(e=>setError(e.message))},[]);const add=()=>setRows([...rows,{foodItemId:items[0]?.id||"",quantity:1,rate:Number(items[0]?.purchaseRate||0)}]);const total=rows.reduce((s,r)=>s+Number(r.quantity||0)*Number(r.rate||0),0);const save=async()=>{try{if(!supplierId||!rows.length)throw new Error("Supplier and at least one item are required.");await request("/purchases","POST",{supplierId:Number(supplierId),invoiceNo,items:rows.map(r=>({foodItemId:Number(r.foodItemId),quantity:Number(r.quantity),rate:Number(r.rate)})),totalAmount:total});alert("Purchase received successfully");setRows([])}catch(e){setError(e instanceof Error?e.message:"Purchase failed")}};return <><Header title={label(lang,"Purchase Entry","खरीद प्रविष्टि")} lang={lang}/>{error&&<div className="alert error">{error}</div>}<Card><div className="form-grid"><div className="field"><label>Supplier</label><select value={supplierId} onChange={e=>setSupplierId(e.target.value)}><option value="">Select Supplier</option>{suppliers.map(s=><option key={s.id} value={s.id}>{localized(lang,s,"nameEn","nameHi","name")}</option>)}</select></div><div className="field"><label>Supplier Invoice No</label><input value={invoiceNo} onChange={e=>setInvoiceNo(e.target.value)}/></div></div></Card><Card><div className="toolbar"><strong>Purchase Items</strong></div><div className="table-wrap"><table><thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>{rows.map((r,i)=><tr key={i}><td><select value={r.foodItemId} onChange={e=>{const a=[...rows];a[i]={...a[i],foodItemId:Number(e.target.value),rate:Number(items.find(x=>x.id==Number(e.target.value))?.purchaseRate||0)};setRows(a)}}>{items.map(x=><option key={x.id} value={x.id}>{localized(lang,x,"nameEn","nameHi","name")}</option>)}</select></td><td><input type="number" value={r.quantity} onChange={e=>{const a=[...rows];a[i]={...a[i],quantity:e.target.value};setRows(a)}}/></td><td><input type="number" value={r.rate} onChange={e=>{const a=[...rows];a[i]={...a[i],rate:e.target.value};setRows(a)}}/></td><td>₹ {money(Number(r.quantity||0)*Number(r.rate||0))}</td></tr>)}</tbody></table></div><div className="form-actions"><button className="secondary-btn" onClick={add}>＋ Add Item</button></div><div className="total-box">Total: <strong>₹ {money(total)}</strong></div><button className="primary-btn" onClick={save}>✓ Receive Purchase</button></Card></>}

function InventoryPage({ lang }: { lang: Language }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setError("");

      const response = await request("/inventory/stock");

      setRows(response.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load inventory");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <>
      <Header
        title={label(lang, "Inventory / Stock", "इन्वेंटरी / स्टॉक")}
        lang={lang}
        action={
          <button className="secondary-btn" onClick={() => void load()}>
            ↻ Refresh
          </button>
        }
      />

      {error && <div className="alert error">{error}</div>}

      <Card>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Food Item</th>
                <th>Unit</th>
                <th>Current</th>
                <th>Minimum</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    {localized(
                      lang,
                      r,
                      "nameEn",
                      "nameHi",
                      "name"
                    )}
                  </td>

                  <td>
                    {r.unit?.shortName ||
                      r.unit?.name ||
                      ""}
                  </td>

                  <td>{r.currentStock}</td>

                  <td>{r.minimumStock}</td>

                  <td>
                    {r.stockStatus ||
                      (Number(r.currentStock || 0) <=
                      Number(r.minimumStock || 0)
                        ? "LOW"
                        : "OK")}
                  </td>
                </tr>
              ))}

              {!rows.length && !error && (
                <tr>
                  <td colSpan={5} className="empty-state">
                    No inventory records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
function WastagePage({lang}:{lang:Language}){const [items,setItems]=useState<Row[]>([]);const [itemId,setItemId]=useState("");const [qty,setQty]=useState("");const [reason,setReason]=useState("SPOILED");const [remarks,setRemarks]=useState("");const [error,setError]=useState("");useEffect(()=>{request("/food-items").then(r=>setItems(r.data||[])).catch(e=>setError(e.message))},[]);const save=async()=>{try{await request("/inventory/wastage","POST",{foodItemId:Number(itemId),quantity:Number(qty),reason,remarks});alert("Wastage recorded");setQty("");setRemarks("")}catch(e){setError(e instanceof Error?e.message:"Failed")}};return <><Header title={label(lang,"Wastage","बर्बादी")} lang={lang}/>{error&&<div className="alert error">{error}</div>}<Card><div className="form-grid"><div className="field"><label>Food Item</label><select value={itemId} onChange={e=>setItemId(e.target.value)}><option value="">Select</option>{items.map(i=><option key={i.id} value={i.id}>{localized(lang,i,"nameEn","nameHi","name")}</option>)}</select></div><div className="field"><label>Quantity</label><input type="number" min="0.001" step="0.001" value={qty} onChange={e=>setQty(e.target.value)}/></div><div className="field"><label>Reason</label><select value={reason} onChange={e=>setReason(e.target.value)}>{["SPOILED","DAMAGED","EXPIRED","OVERCOOKED","LEFTOVER","OTHER"].map(x=><option key={x}>{x}</option>)}</select></div><div className="field"><label>Remarks</label><input value={remarks} onChange={e=>setRemarks(e.target.value)}/></div></div><button className="primary-btn" onClick={save}>✓ Record Wastage</button></Card></>}

function ExpensePage({lang}:{lang:Language}){const [category,setCategory]=useState("OTHER");const [amount,setAmount]=useState("");const [date,setDate]=useState(new Date().toISOString().slice(0,10));const [description,setDescription]=useState("");const [error,setError]=useState("");const save=async()=>{try{await request("/expenses","POST",{expenseDate:date,category,amount:Number(amount),description});alert("Expense saved");setAmount("");setDescription("")}catch(e){setError(e instanceof Error?e.message:"Expense failed")}};return <><Header title={label(lang,"Expense Entry","व्यय प्रविष्टि")} lang={lang}/>{error&&<div className="alert error">{error}</div>}<Card><div className="form-grid"><div className="field"><label>Date</label><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></div><div className="field"><label>Category</label><select value={category} onChange={e=>setCategory(e.target.value)}>{["ELECTRICITY","GAS","SALARY","TRANSPORT","REPAIR","CLEANING","PACKAGING","MAINTENANCE","OTHER"].map(x=><option key={x}>{x}</option>)}</select></div><div className="field"><label>Amount</label><input type="number" min="0.01" value={amount} onChange={e=>setAmount(e.target.value)}/></div><div className="field"><label>Description</label><input value={description} onChange={e=>setDescription(e.target.value)}/></div></div><button className="primary-btn" onClick={save}>✓ Save Expense</button></Card></>}

function BulkPage({lang}:{lang:Language}){const [items,setItems]=useState<Row[]>([]);const [departments,setDepartments]=useState<Row[]>([]);const [departmentId,setDepartmentId]=useState("");const [rows,setRows]=useState<Row[]>([]);const [error,setError]=useState("");useEffect(()=>{Promise.all([request("/food-items"),request("/departments")]).then(([i,d])=>{setItems(i.data||[]);setDepartments(d.data||[])}).catch(e=>setError(e.message))},[]);const add=()=>setRows([...rows,{foodItemId:items[0]?.id||"",quantity:1,rate:Number(items[0]?.saleRate||0)}]);const total=rows.reduce((s,r)=>s+Number(r.quantity||0)*Number(r.rate||0),0);const save=async()=>{try{await request("/sales/bulk","POST",{departmentId:departmentId?Number(departmentId):null,items:rows.map(r=>({foodItemId:Number(r.foodItemId),quantity:Number(r.quantity),rate:Number(r.rate)}))});alert("Bulk transaction posted");setRows([])}catch(e){setError(e instanceof Error?e.message:"Bulk entry failed")}};return <><Header title={label(lang,"Bulk Entry","बल्क एंट्री")} lang={lang}/>{error&&<div className="alert error">{error}</div>}<Card><div className="field"><label>Department</label><select value={departmentId} onChange={e=>setDepartmentId(e.target.value)}><option value="">Select Department</option>{departments.map(d=><option key={d.id} value={d.id}>{localized(lang,d,"nameEn","nameHi","name")}</option>)}</select></div></Card><Card><div className="toolbar"><strong>Bulk Items</strong></div><div className="table-wrap"><table><thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>{rows.map((r,i)=><tr key={i}><td><select value={r.foodItemId} onChange={e=>{const a=[...rows];a[i]={...a[i],foodItemId:Number(e.target.value),rate:Number(items.find(x=>x.id==Number(e.target.value))?.saleRate||0)};setRows(a)}}>{items.map(x=><option key={x.id} value={x.id}>{localized(lang,x,"nameEn","nameHi","name")}</option>)}</select></td><td><input type="number" value={r.quantity} onChange={e=>{const a=[...rows];a[i]={...a[i],quantity:e.target.value};setRows(a)}}/></td><td><input type="number" value={r.rate} onChange={e=>{const a=[...rows];a[i]={...a[i],rate:e.target.value};setRows(a)}}/></td><td>₹ {money(Number(r.quantity||0)*Number(r.rate||0))}</td></tr>)}</tbody></table></div><div className="form-actions"><button className="secondary-btn" onClick={add}>＋ Add Item</button></div><div className="total-box">Total: <strong>₹ {money(total)}</strong></div><button className="primary-btn" onClick={save}>✓ Review & Post</button></Card></>}

function PartyLedgerPage({lang}:{lang:Language}) {
  const now=new Date(); const [parties,setParties]=useState<Row[]>([]); const [partyId,setPartyId]=useState(""); const [month,setMonth]=useState(String(now.getMonth()+1)); const [year,setYear]=useState(String(now.getFullYear())); const [data,setData]=useState<Row|null>(null); const [error,setError]=useState("");
  useEffect(()=>{request("/parties").then(r=>setParties(r.data||[])).catch(e=>setError(e.message))},[]);
  const load=async()=>{try{if(!partyId) throw new Error("Select a party.");setError("");const r=await request(`/ledger/monthly?partyId=${partyId}&month=${month}&year=${year}`);setData(r.data||null);}catch(e){setError(e instanceof Error?e.message:"Unable to load statement");}};
  const print=()=>window.print();
  return <><Header title={label(lang,"Party Monthly Ledger","पार्टी मासिक लेजर")} lang={lang}/>{error&&<div className="alert error">{error}</div>}<Card><div className="form-grid"><div className="field"><label>Party</label><SearchableSelect value={partyId} onChange={setPartyId} options={parties.map(p=>({id:p.id,label:localized(lang,p,"partyNameEn","partyNameHi","partyName")}))} placeholder="Search Party"/></div><div className="field"><label>Month</label><select value={month} onChange={e=>setMonth(e.target.value)}>{Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{new Date(2000,i,1).toLocaleString(lang==="hi"?"hi-IN":"en-IN",{month:"long"})}</option>)}</select></div><div className="field"><label>Year</label><input type="number" value={year} onChange={e=>setYear(e.target.value)}/></div></div><div className="form-actions"><button className="primary-btn" onClick={()=>void load()}>View Statement</button>{data&&<button className="secondary-btn" onClick={print}>🖨 Print Statement</button>}</div></Card>
  {data&&<Card><div className="statement-head"><h2>{label(lang,"PARTY MONTHLY STATEMENT","पार्टी मासिक विवरण")}</h2><p>{localized(lang,data.party,"partyNameEn","partyNameHi","partyName")} — {data.periodLabel}</p></div><div className="summary-grid"><div><span>Opening Outstanding</span><strong>₹ {money(data.summary.openingOutstanding)}</strong></div><div><span>Total Sales</span><strong>₹ {money(data.summary.totalSales)}</strong></div><div><span>Total Paid</span><strong>₹ {money(data.summary.totalPaid)}</strong></div><div><span>Current Month Credit</span><strong>₹ {money(data.summary.currentMonthCredit)}</strong></div><div><span>Payments Against Outstanding</span><strong>₹ {money(data.summary.paymentsAgainstOutstanding)}</strong></div><div><span>Closing Outstanding</span><strong>₹ {money(data.summary.closingOutstanding)}</strong></div></div><div className="table-wrap"><table><thead><tr><th>Date</th><th>Bill No</th><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th><th>Paid</th><th>Credit</th><th>Status</th></tr></thead><tbody>{data.transactions.map((r:Row)=><tr key={r.id}><td>{new Date(r.date).toLocaleDateString("en-IN")}</td><td>{r.billNo||r.receiptNo||""}</td><td>{r.itemName||r.description||"Payment"}</td><td>{r.quantity??""}</td><td>{r.rate!=null?`₹ ${money(r.rate)}`:""}</td><td>₹ {money(r.amount)}</td><td>₹ {money(r.paid)}</td><td>₹ {money(r.credit)}</td><td>{r.status}</td></tr>)}</tbody></table></div></Card>}
  </>;
}

export function ModulePage({module,lang}:{module:string;lang:Language}) {
  if(["departments","parties","persons","categories","food-items","units","suppliers","rates"].includes(module)) return <MasterPage module={module} lang={lang}/>;
  if(module==="sale") return <SalePage lang={lang}/>;
  if(module==="payment") return <PaymentPage lang={lang}/>;
  if(module==="purchase") return <PurchasePage lang={lang}/>;
  if(module==="inventory") return <InventoryPage lang={lang}/>;
  if(module==="wastage") return <WastagePage lang={lang}/>;
  if(module==="expenses-entry") return <ExpensePage lang={lang}/>;
  if(module==="bulk") return <BulkPage lang={lang}/>;
  if(module==="ledger") return <PartyLedgerPage lang={lang}/>;
  return <div className="module-card"><h2>{module}</h2><p>Module ready for the corresponding secured API.</p></div>;
}
