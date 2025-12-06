from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from io import BytesIO
import qrcode
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image as RLImage
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from reportlab.lib import colors
from urllib.request import urlopen
from PIL import Image

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'tecno-dias-secret-key-2025')
ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# ===== MODELS =====
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: EmailStr
    name: str
    created_at: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User

class Item(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    nome: str
    preco_real: float
    preco_venda: float
    margem: float
    desconto_maximo: float
    categoria: str = "material"
    created_at: str

class ItemCreate(BaseModel):
    nome: str
    preco_real: float
    preco_venda: float
    desconto_maximo: float = 10.0
    categoria: str = "material"

class ItemUpdate(BaseModel):
    nome: Optional[str] = None
    preco_real: Optional[float] = None
    preco_venda: Optional[float] = None
    desconto_maximo: Optional[float] = None
    categoria: Optional[str] = None

class ClienteInfo(BaseModel):
    nome: str
    endereco: str
    contato: str

class OrcamentoItem(BaseModel):
    item_id: str
    nome: str
    quantidade: int
    preco_unitario: float
    total_item: float

class Orcamento(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id_orcamento: str
    cliente: ClienteInfo
    data: str
    items: List[OrcamentoItem]
    total_sem_desconto: float
    mao_de_obra: float = 0.0
    desconto_aplicado: float = 0.0
    total_final: float
    status: str = "Pendente"
    observacoes: Optional[str] = ""
    created_at: str

class OrcamentoCreate(BaseModel):
    cliente: ClienteInfo
    items: List[OrcamentoItem]
    mao_de_obra: float = 0.0
    desconto_aplicado: float = 0.0
    observacoes: Optional[str] = ""

class OrcamentoUpdate(BaseModel):
    cliente: Optional[ClienteInfo] = None
    items: Optional[List[OrcamentoItem]] = None
    desconto_aplicado: Optional[float] = None
    status: Optional[str] = None
    observacoes: Optional[str] = None

class StatusUpdate(BaseModel):
    status: str

class DashboardStats(BaseModel):
    total_orcamentos: int
    valor_total_vendido: float
    pendentes: int
    aprovados: int
    reprovados: int
    ticket_medio: float

class VendasPorMes(BaseModel):
    mes: str
    valor: float
    quantidade: int

class ItemMaisVendido(BaseModel):
    nome: str
    quantidade: int
    valor_total: float

class DashboardCharts(BaseModel):
    vendas_por_mes: List[VendasPorMes]
    margem_total: float
    items_mais_vendidos: List[ItemMaisVendido]

# ===== AUTH HELPERS =====
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token inválido")
        
        user_doc = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
        if user_doc is None:
            raise HTTPException(status_code=401, detail="Usuário não encontrado")
        
        return User(**user_doc)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

# ===== AUTH ROUTES =====
@api_router.post("/auth/login", response_model=Token)
async def login(user_login: UserLogin):
    user_doc = await db.users.find_one({"email": user_login.email}, {"_id": 0})
    
    if not user_doc or not verify_password(user_login.password, user_doc['password_hash']):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")
    
    access_token = create_access_token(data={"sub": user_doc['id']})
    user_data = {k: v for k, v in user_doc.items() if k != 'password_hash'}
    
    return Token(access_token=access_token, user=User(**user_data))

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# ===== ITEMS ROUTES =====
@api_router.get("/items", response_model=List[Item])
async def get_items(search: Optional[str] = None, categoria: Optional[str] = None, current_user: User = Depends(get_current_user)):
    query = {}
    if search:
        query['nome'] = {"$regex": search, "$options": "i"}
    if categoria:
        query['categoria'] = categoria
    
    items = await db.items.find(query, {"_id": 0}).sort("nome", 1).to_list(1000)
    return items

@api_router.post("/items", response_model=Item)
async def create_item(item_data: ItemCreate, current_user: User = Depends(get_current_user)):
    import uuid
    
    # Calculate margin
    margem = ((item_data.preco_venda - item_data.preco_real) / item_data.preco_venda) * 100 if item_data.preco_venda > 0 else 0
    
    item = Item(
        id=str(uuid.uuid4()),
        nome=item_data.nome,
        preco_real=item_data.preco_real,
        preco_venda=item_data.preco_venda,
        margem=round(margem, 2),
        desconto_maximo=item_data.desconto_maximo,
        categoria=item_data.categoria,
        created_at=datetime.now(timezone.utc).isoformat()
    )
    
    await db.items.insert_one(item.model_dump())
    return item

@api_router.put("/items/{item_id}", response_model=Item)
async def update_item(item_id: str, item_update: ItemUpdate, current_user: User = Depends(get_current_user)):
    existing_item = await db.items.find_one({"id": item_id}, {"_id": 0})
    if not existing_item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    
    update_data = {k: v for k, v in item_update.model_dump().items() if v is not None}
    
    # Recalculate margin if prices changed
    preco_real = update_data.get('preco_real', existing_item['preco_real'])
    preco_venda = update_data.get('preco_venda', existing_item['preco_venda'])
    margem = ((preco_venda - preco_real) / preco_venda) * 100 if preco_venda > 0 else 0
    update_data['margem'] = round(margem, 2)
    
    await db.items.update_one({"id": item_id}, {"$set": update_data})
    
    updated_item = await db.items.find_one({"id": item_id}, {"_id": 0})
    return Item(**updated_item)

@api_router.delete("/items/{item_id}")
async def delete_item(item_id: str, current_user: User = Depends(get_current_user)):
    result = await db.items.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    return {"message": "Item excluído com sucesso"}

# ===== ORCAMENTOS ROUTES =====
@api_router.get("/orcamentos", response_model=List[Orcamento])
async def get_orcamentos(status: Optional[str] = None, search: Optional[str] = None, current_user: User = Depends(get_current_user)):
    query = {}
    if status:
        query['status'] = status
    if search:
        query['cliente.nome'] = {"$regex": search, "$options": "i"}
    
    orcamentos = await db.orcamentos.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return orcamentos

@api_router.get("/orcamentos/{id_orcamento}", response_model=Orcamento)
async def get_orcamento(id_orcamento: str, current_user: User = Depends(get_current_user)):
    orcamento = await db.orcamentos.find_one({"id_orcamento": id_orcamento}, {"_id": 0})
    if not orcamento:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    return Orcamento(**orcamento)

@api_router.post("/orcamentos", response_model=Orcamento)
async def create_orcamento(orc_data: OrcamentoCreate, current_user: User = Depends(get_current_user)):
    from datetime import datetime
    
    now = datetime.now(timezone.utc)
    ano = now.year
    
    # Get next number for this year
    last_orc = await db.orcamentos.find_one(
        {"id_orcamento": {"$regex": f"^ORC-{ano}-"}},
        {"_id": 0, "id_orcamento": 1},
        sort=[("created_at", -1)]
    )
    
    if last_orc:
        last_num = int(last_orc['id_orcamento'].split('-')[-1])
        new_num = last_num + 1
    else:
        new_num = 1
    
    id_orcamento = f"ORC-{ano}-{new_num:04d}"
    
    total_sem_desconto = sum(item.total_item for item in orc_data.items)
    total_final = total_sem_desconto - orc_data.desconto_aplicado
    
    orcamento = Orcamento(
        id_orcamento=id_orcamento,
        cliente=orc_data.cliente,
        data=now.strftime("%d/%m/%Y"),
        items=orc_data.items,
        total_sem_desconto=round(total_sem_desconto, 2),
        desconto_aplicado=round(orc_data.desconto_aplicado, 2),
        total_final=round(total_final, 2),
        status="Pendente",
        observacoes=orc_data.observacoes or "",
        created_at=now.isoformat()
    )
    
    await db.orcamentos.insert_one(orcamento.model_dump())
    return orcamento

@api_router.put("/orcamentos/{id_orcamento}", response_model=Orcamento)
async def update_orcamento(id_orcamento: str, orc_update: OrcamentoUpdate, current_user: User = Depends(get_current_user)):
    existing_orc = await db.orcamentos.find_one({"id_orcamento": id_orcamento}, {"_id": 0})
    if not existing_orc:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    
    update_data = {k: v for k, v in orc_update.model_dump().items() if v is not None}
    
    # Recalculate totals if items or desconto changed
    if 'items' in update_data or 'desconto_aplicado' in update_data:
        items = update_data.get('items', existing_orc['items'])
        desconto = update_data.get('desconto_aplicado', existing_orc['desconto_aplicado'])
        
        total_sem_desconto = sum(item['total_item'] if isinstance(item, dict) else item.total_item for item in items)
        total_final = total_sem_desconto - desconto
        
        update_data['total_sem_desconto'] = round(total_sem_desconto, 2)
        update_data['total_final'] = round(total_final, 2)
    
    await db.orcamentos.update_one({"id_orcamento": id_orcamento}, {"$set": update_data})
    
    updated_orc = await db.orcamentos.find_one({"id_orcamento": id_orcamento}, {"_id": 0})
    return Orcamento(**updated_orc)

@api_router.patch("/orcamentos/{id_orcamento}/status")
async def update_orcamento_status(id_orcamento: str, status_update: StatusUpdate, current_user: User = Depends(get_current_user)):
    if status_update.status not in ["Pendente", "Aprovado", "Reprovado"]:
        raise HTTPException(status_code=400, detail="Status inválido")
    
    result = await db.orcamentos.update_one({"id_orcamento": id_orcamento}, {"$set": {"status": status_update.status}})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    
    return {"message": "Status atualizado com sucesso"}

# ===== DASHBOARD ROUTES =====
@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    orcamentos = await db.orcamentos.find({}, {"_id": 0}).to_list(10000)
    
    total_orcamentos = len(orcamentos)
    valor_total_vendido = sum(orc['total_final'] for orc in orcamentos if orc['status'] == 'Aprovado')
    pendentes = len([o for o in orcamentos if o['status'] == 'Pendente'])
    aprovados = len([o for o in orcamentos if o['status'] == 'Aprovado'])
    reprovados = len([o for o in orcamentos if o['status'] == 'Reprovado'])
    ticket_medio = valor_total_vendido / aprovados if aprovados > 0 else 0
    
    return DashboardStats(
        total_orcamentos=total_orcamentos,
        valor_total_vendido=round(valor_total_vendido, 2),
        pendentes=pendentes,
        aprovados=aprovados,
        reprovados=reprovados,
        ticket_medio=round(ticket_medio, 2)
    )

@api_router.get("/dashboard/charts", response_model=DashboardCharts)
async def get_dashboard_charts(current_user: User = Depends(get_current_user)):
    orcamentos = await db.orcamentos.find({"status": "Aprovado"}, {"_id": 0}).to_list(10000)
    
    # Vendas por mês
    vendas_por_mes_dict = {}
    for orc in orcamentos:
        try:
            mes_str = orc['data'].split('/')[1] + '/' + orc['data'].split('/')[2]  # MM/YYYY
            if mes_str not in vendas_por_mes_dict:
                vendas_por_mes_dict[mes_str] = {'valor': 0, 'quantidade': 0}
            vendas_por_mes_dict[mes_str]['valor'] += orc['total_final']
            vendas_por_mes_dict[mes_str]['quantidade'] += 1
        except:
            pass
    
    vendas_por_mes = [
        VendasPorMes(mes=mes, valor=round(data['valor'], 2), quantidade=data['quantidade'])
        for mes, data in sorted(vendas_por_mes_dict.items())
    ][-12:]  # Last 12 months
    
    # Margem total
    total_custo = 0
    total_venda = 0
    for orc in orcamentos:
        for item in orc['items']:
            item_doc = await db.items.find_one({"id": item['item_id']}, {"_id": 0})
            if item_doc:
                total_custo += item_doc['preco_real'] * item['quantidade']
                total_venda += item['preco_unitario'] * item['quantidade']
    
    margem_total = ((total_venda - total_custo) / total_venda * 100) if total_venda > 0 else 0
    
    # Items mais vendidos
    items_vendidos = {}
    for orc in orcamentos:
        for item in orc['items']:
            if item['item_id'] not in items_vendidos:
                items_vendidos[item['item_id']] = {
                    'nome': item['nome'],
                    'quantidade': 0,
                    'valor_total': 0
                }
            items_vendidos[item['item_id']]['quantidade'] += item['quantidade']
            items_vendidos[item['item_id']]['valor_total'] += item['total_item']
    
    items_mais_vendidos = [
        ItemMaisVendido(**data)
        for data in sorted(items_vendidos.values(), key=lambda x: x['quantidade'], reverse=True)
    ][:10]
    
    return DashboardCharts(
        vendas_por_mes=vendas_por_mes,
        margem_total=round(margem_total, 2),
        items_mais_vendidos=items_mais_vendidos
    )

# ===== PDF GENERATION =====
@api_router.get("/orcamentos/{id_orcamento}/pdf")
async def generate_pdf(id_orcamento: str, current_user: User = Depends(get_current_user)):
    orcamento = await db.orcamentos.find_one({"id_orcamento": id_orcamento}, {"_id": 0})
    if not orcamento:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
    story = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#06b6d4'),
        alignment=TA_CENTER,
        spaceAfter=12
    )
    
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#475569'),
        alignment=TA_CENTER,
        spaceAfter=20
    )
    
    # Logo
    try:
        logo_url = 'https://customer-assets.emergentagent.com/job_6a1d4806-8932-4f80-b5f2-32162d8861f2/artifacts/p3cmz4m7_empresa%20%27Tecno%20Dias%27.jpg'
        logo_data = urlopen(logo_url).read()
        logo_img = Image.open(BytesIO(logo_data))
        logo_width, logo_height = logo_img.size
        aspect = logo_height / logo_width
        logo = RLImage(BytesIO(logo_data), width=2*inch, height=2*inch*aspect)
        story.append(logo)
    except:
        pass
    
    story.append(Spacer(1, 0.2*inch))
    
    # Title
    story.append(Paragraph("ORÇAMENTO", title_style))
    story.append(Paragraph(f"Nº {id_orcamento}", subtitle_style))
    story.append(Spacer(1, 0.3*inch))
    
    # Client info
    client_data = [
        ['<b>Cliente:</b>', orcamento['cliente']['nome']],
        ['<b>Endereço:</b>', orcamento['cliente']['endereco']],
        ['<b>Contato:</b>', orcamento['cliente']['contato']],
        ['<b>Data:</b>', orcamento['data']]
    ]
    
    client_table = Table(client_data, colWidths=[1.5*inch, 4.5*inch])
    client_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#1e293b')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(client_table)
    story.append(Spacer(1, 0.3*inch))
    
    # Items table
    items_data = [['Item', 'Qtd', 'Preço Unit.', 'Total']]
    for item in orcamento['items']:
        items_data.append([
            item['nome'],
            str(item['quantidade']),
            f"R$ {item['preco_unitario']:.2f}",
            f"R$ {item['total_item']:.2f}"
        ])
    
    items_table = Table(items_data, colWidths=[3*inch, 0.8*inch, 1.2*inch, 1.2*inch])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#06b6d4')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')])
    ]))
    story.append(items_table)
    story.append(Spacer(1, 0.2*inch))
    
    # Totals
    totals_data = []
    if orcamento['desconto_aplicado'] > 0:
        totals_data.append(['Subtotal:', f"R$ {orcamento['total_sem_desconto']:.2f}"])
        totals_data.append(['Desconto:', f"- R$ {orcamento['desconto_aplicado']:.2f}"])
    totals_data.append(['<b>TOTAL:</b>', f"<b>R$ {orcamento['total_final']:.2f}</b>"])
    
    totals_table = Table(totals_data, colWidths=[4.8*inch, 1.4*inch])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, -2), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, -1), (-1, -1), 12),
        ('TEXTCOLOR', (0, -1), (-1, -1), colors.HexColor('#06b6d4')),
        ('TOPPADDING', (0, -1), (-1, -1), 8),
    ]))
    story.append(totals_table)
    story.append(Spacer(1, 0.3*inch))
    
    # QR Code PIX
    pix_key = "586915070001-19"
    pix_nome = "Ygor Felipe Dias"
    pix_cidade = "São Carlos"
    pix_value = orcamento['total_final']
    
    pix_text = f"PIX: {pix_key}\nBeneficiário: {pix_nome}\nValor: R$ {pix_value:.2f}"
    
    qr = qrcode.QRCode(version=1, box_size=4, border=2)
    qr.add_data(pix_text)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white")
    
    qr_buffer = BytesIO()
    qr_img.save(qr_buffer, format='PNG')
    qr_buffer.seek(0)
    
    qr_image = RLImage(qr_buffer, width=1.5*inch, height=1.5*inch)
    
    pix_data = [[
        Paragraph('<b>Pagamento via PIX</b><br/>' + pix_text.replace('\n', '<br/>'), styles['Normal']),
        qr_image
    ]]
    
    pix_table = Table(pix_data, colWidths=[4*inch, 2*inch])
    pix_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e1')),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f1f5f9')),
        ('LEFTPADDING', (0, 0), (0, 0), 10),
    ]))
    story.append(pix_table)
    story.append(Spacer(1, 0.3*inch))
    
    # Observações
    obs_text = "<b>Observações:</b><br/>" + (
        "• Validade: 30 dias<br/>" +
        "• Garantia: 90 dias<br/>" +
        "• Preços sujeitos a alteração conforme disponibilidade de materiais<br/>" +
        "• Atendimento rápido<br/>" +
        "• Suporte pós-venda"
    )
    if orcamento.get('observacoes'):
        obs_text += "<br/><br/>" + orcamento['observacoes']
    
    story.append(Paragraph(obs_text, styles['Normal']))
    
    doc.build(story)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=orcamento_{id_orcamento}.pdf"}
    )

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    # Create default user if not exists
    existing_user = await db.users.find_one({"email": "tecnodias25@outlook.com"})
    if not existing_user:
        import uuid
        default_user = {
            "id": str(uuid.uuid4()),
            "email": "tecnodias25@outlook.com",
            "password_hash": hash_password("t3cnica@"),
            "name": "Ygor Dias",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(default_user)
        logger.info("Default user created")
    
    # Seed initial items if database is empty
    items_count = await db.items.count_documents({})
    if items_count == 0:
        import uuid
        initial_items = [
            {"nome": "Cameras", "preco_real": 70.00, "preco_venda": 170.00, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "DVR Intelbras", "preco_real": 418.46, "preco_venda": 1016.26, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "HD 500G", "preco_real": 49.00, "preco_venda": 119.00, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "No Break Intelbras 600VA", "preco_real": 278.27, "preco_venda": 675.80, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Fonte MCM 12V 10A", "preco_real": 119.00, "preco_venda": 289.00, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Caixinhas de passagem", "preco_real": 2.43, "preco_venda": 5.90, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Cabo coaxial + alimentação 100m", "preco_real": 59.50, "preco_venda": 144.50, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Rack 3U com porta", "preco_real": 62.99, "preco_venda": 152.98, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Par de balun", "preco_real": 6.30, "preco_venda": 15.30, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Conector P4 macho", "preco_real": 2.31, "preco_venda": 5.61, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Aterramento Virtual", "preco_real": 10.50, "preco_venda": 25.50, "desconto_maximo": 10, "categoria": "servico"},
            {"nome": "Big Aste", "preco_real": 14.28, "preco_venda": 34.68, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Configuração de DVR", "preco_real": 56.00, "preco_venda": 136.00, "desconto_maximo": 0, "categoria": "servico"},
            {"nome": "Avaliação de central de alarme", "preco_real": 28.00, "preco_venda": 68.00, "desconto_maximo": 0, "categoria": "servico"},
            {"nome": "Fonte Alime Intertravamento", "preco_real": 111.93, "preco_venda": 271.83, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Fechadura Eletroima", "preco_real": 186.38, "preco_venda": 452.63, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Suporte P/vidro", "preco_real": 90.00, "preco_venda": 218.57, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Relé acionador trava", "preco_real": 16.10, "preco_venda": 39.10, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Kit 10 brocantes sextavado", "preco_real": 8.75, "preco_venda": 21.25, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Manutenção de cerca 10M", "preco_real": 56.00, "preco_venda": 136.00, "desconto_maximo": 0, "categoria": "servico"},
            {"nome": "No Break Intelbras portão 600va", "preco_real": 255.29, "preco_venda": 619.99, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Key Stone", "preco_real": 10.50, "preco_venda": 25.50, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Cabo de alta Tenção", "preco_real": 31.50, "preco_venda": 76.50, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Kit 80 parafusos e bucha 8mm", "preco_real": 45.50, "preco_venda": 110.50, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Trava Dog", "preco_real": 69.30, "preco_venda": 168.30, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Fotocelula F32", "preco_real": 94.50, "preco_venda": 229.50, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Suporte de Fixação", "preco_real": 17.50, "preco_venda": 42.50, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Cabo PP 1,5mm", "preco_real": 4.20, "preco_venda": 10.20, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Cabo de rede", "preco_real": 2.45, "preco_venda": 5.95, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Cabo paralelo 1,5mm", "preco_real": 1.75, "preco_venda": 4.25, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Canaletas tipo X", "preco_real": 4.59, "preco_venda": 11.14, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Camera VIPW 1230", "preco_real": 261.06, "preco_venda": 634.00, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Motor BV home convencional 1/4", "preco_real": 353.50, "preco_venda": 858.50, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Motor BV home Legero 1/4", "preco_real": 339.50, "preco_venda": 824.50, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Motor BV home Jetflex 1/4", "preco_real": 546.00, "preco_venda": 1326.00, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Motor BV penta convencional 1/2", "preco_real": 598.50, "preco_venda": 1453.50, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Motor BV penta legero 1/2", "preco_real": 623.00, "preco_venda": 1513.00, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Motor BV penta 450 jetflex 1/2", "preco_real": 756.00, "preco_venda": 1836.00, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Motor BV penta condo jetflex 1/2", "preco_real": 889.00, "preco_venda": 2159.00, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Motor BV Potenza 16seg 1/3", "preco_real": 469.00, "preco_venda": 1139.00, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Motor BV Legero 8seg 1/3", "preco_real": 483.00, "preco_venda": 1173.00, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Motor BV jetflex 4seg 1/3", "preco_real": 651.00, "preco_venda": 1581.00, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "SSD 250", "preco_real": 56.00, "preco_venda": 136.00, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Memoria ram 8gb", "preco_real": 70.00, "preco_venda": 170.00, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Formatação", "preco_real": 65.88, "preco_venda": 160.00, "desconto_maximo": 0, "categoria": "servico"},
            {"nome": "Despesas de material eletrico", "preco_real": 70.00, "preco_venda": 170.00, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Central de Choque", "preco_real": 143.22, "preco_venda": 347.82, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Roteador TP-LINK AX3000", "preco_real": 560.00, "preco_venda": 1360.00, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Cabo DROP flat 1FO", "preco_real": 1.60, "preco_venda": 3.89, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Conversor de mídia fibra", "preco_real": 206.50, "preco_venda": 501.50, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Switch gigabit 5 portas 4 poe", "preco_real": 203.00, "preco_venda": 493.00, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Bandeja 1U p/ rack 19", "preco_real": 27.30, "preco_venda": 66.30, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Rack outdoor AZLINK 8U", "preco_real": 724.50, "preco_venda": 1759.50, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Calha de tomada para rack 19", "preco_real": 55.30, "preco_venda": 134.30, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Porteiro residencial", "preco_real": 142.70, "preco_venda": 346.55, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Extensão video porteiro", "preco_real": 238.00, "preco_venda": 578.00, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Protetor", "preco_real": 18.90, "preco_venda": 45.90, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Video porteiro c/ monofone", "preco_real": 280.00, "preco_venda": 680.00, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Extensão porteiro", "preco_real": 71.40, "preco_venda": 173.40, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Bateria sel", "preco_real": 49.41, "preco_venda": 119.99, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Haste p/ cerca 3/4", "preco_real": 5.73, "preco_venda": 13.91, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Sapata Big haste", "preco_real": 5.17, "preco_venda": 12.56, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Bobina aço inox", "preco_real": 34.23, "preco_venda": 83.13, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Gravador MHDX 1116", "preco_real": 858.75, "preco_venda": 2085.54, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Camera Vip 1230 dome", "preco_real": 230.30, "preco_venda": 559.30, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Caixa de passagem CFTV VBOX", "preco_real": 21.00, "preco_venda": 51.00, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Refletor LED Elgin 100W", "preco_real": 63.00, "preco_venda": 153.00, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Cabo PP 2x0,75mm", "preco_real": 3.50, "preco_venda": 8.50, "desconto_maximo": 10, "categoria": "material"},
            {"nome": "Deslocamento técnico", "preco_real": 31.50, "preco_venda": 76.50, "desconto_maximo": 0, "categoria": "servico"}
        ]
        
        items_to_insert = []
        for item_data in initial_items:
            margem = ((item_data['preco_venda'] - item_data['preco_real']) / item_data['preco_venda']) * 100 if item_data['preco_venda'] > 0 else 0
            items_to_insert.append({
                "id": str(uuid.uuid4()),
                "nome": item_data['nome'],
                "preco_real": item_data['preco_real'],
                "preco_venda": item_data['preco_venda'],
                "margem": round(margem, 2),
                "desconto_maximo": item_data['desconto_maximo'],
                "categoria": item_data['categoria'],
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        
        await db.items.insert_many(items_to_insert)
        logger.info(f"Seeded {len(items_to_insert)} initial items")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()