# Edge Functions Documentation - Sweepstakes

Documentação das 6 edge functions do projeto Sweepstakes.

---

## 1. Create Participant

**Endpoint:** `POST /functions/v1/create-participant`

### Descrição
Cria um novo participante no sweepstake. Se o email já existe, retorna os dados do participante existente.

### Body Esperado
```json
{
  "email": "joao@example.com"
}
```

**Validações:**
- `email`: string obrigatório, deve conter `@`
- Email é normalizado: `.trim().toLowerCase()`
- Nome é extraído automaticamente do email (parte antes do @)

### Response de Sucesso (201 - novo | 200 - existente)
```json
{
  "success": true,
  "message": "Participant created successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "joao",
    "email": "joao@example.com",
    "created_at": "2026-05-15T10:30:00Z",
    "updated_at": "2026-05-15T10:30:00Z"
  }
}
```

### Respostas de Erro

**400 Bad Request** — Validação falhou
```json
{
  "success": false,
  "message": "Invalid email format"
}
```

**500 Internal Server Error**
```json
{
  "success": false,
  "message": "Internal Server Error"
}
```

### Exemplo de Uso
```bash
curl -X POST http://127.0.0.1:54321/functions/v1/create-participant \
  -H "Content-Type: application/json" \
  -d '{"email": "joao@example.com"}'
```

---

## 2. Create Prediction

**Endpoint:** `POST /functions/v1/create-prediction`

### Descrição
Cria ou atualiza uma previsão de placar para um participante em um match. Se a previsão já existe, atualiza os valores.

### Body Esperado
```json
{
  "participant_id": "550e8400-e29b-41d4-a716-446655440000",
  "match_id": "660e8400-e29b-41d4-a716-446655440000",
  "predicted_home_score": 2,
  "predicted_away_score": 1
}
```

**Validações:**
- `participant_id`: UUID string obrigatório
- `match_id`: UUID string obrigatório
- `predicted_home_score`: número entre 0-99 obrigatório
- `predicted_away_score`: número entre 0-99 obrigatório

### Response de Sucesso

**Criação (201)**
```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "participant_id": "550e8400-e29b-41d4-a716-446655440000",
    "match_id": "660e8400-e29b-41d4-a716-446655440000",
    "predicted_home_score": 2,
    "predicted_away_score": 1,
    "created_at": "2026-05-15T10:30:00Z"
  },
  "message": "Prediction created successfully"
}
```

**Atualização (200)**
```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "participant_id": "550e8400-e29b-41d4-a716-446655440000",
    "match_id": "660e8400-e29b-41d4-a716-446655440000",
    "predicted_home_score": 3,
    "predicted_away_score": 2,
    "created_at": "2026-05-15T10:30:00Z"
  },
  "message": "Prediction updated successfully"
}
```

### Respostas de Erro

**400 Bad Request** — Validação falhou
```json
{
  "success": false,
  "data": null,
  "message": "predicted_home_score must be between 0 and 99"
}
```

**400 Bad Request** — IDs inválidos
```json
{
  "success": false,
  "data": null,
  "message": "Invalid participant_id or match_id"
}
```

**500 Internal Server Error**
```json
{
  "success": false,
  "data": null,
  "message": "Internal Server Error"
}
```

### Exemplo de Uso
```bash
curl -X POST http://127.0.0.1:54321/functions/v1/create-prediction \
  -H "Content-Type: application/json" \
  -d '{
    "participant_id": "550e8400-e29b-41d4-a716-446655440000",
    "match_id": "660e8400-e29b-41d4-a716-446655440000",
    "predicted_home_score": 2,
    "predicted_away_score": 1
  }'
```

---

## 3. Get Matches

**Endpoint:** `GET /functions/v1/get-matches?participant_id=[UUID]`

### Descrição
Retorna os matches da rodada atual (baseado na data do servidor). Agrupa por grupo (A, B, C, etc). Opcionalmente inclui as previsões do participante.

**Rodadas automáticas:**
- Rodada 1: até 18/06/2026
- Rodada 2: até 24/06/2026  
- Rodada 3: até 28/06/2026

### Query Parameters
- `participant_id` (opcional): UUID do participante para incluir suas previsões

### Response de Sucesso (200)
```json
{
  "success": true,
  "data": {
    "current_round": 1,
    "current_date": "2026-05-15T10:30:00Z",
    "total_matches": 4,
    "current_group": "A",
    "groups": {
      "A": [
        {
          "id": "660e8400-e29b-41d4-a716-446655440000",
          "stage": "group",
          "group_name": "A",
          "round_number": 1,
          "match_date": "2026-06-11T16:00:00Z",
          "home_team": "Brasil",
          "away_team": "Sérvia",
          "city": "Brasília",
          "status": "scheduled",
          "home_score": null,
          "away_score": null,
          "predicted_home_score": 2,
          "predicted_away_score": 1
        }
      ]
    },
    "matches": [...]
  },
  "message": "Rodada 1 - Grupo A - 4 matches"
}
```

### Response de Erro (500)
```json
{
  "success": false,
  "data": null,
  "message": "Failed to fetch matches"
}
```

### Exemplo de Uso
```bash
# Sem previsões
curl -X GET http://127.0.0.1:54321/functions/v1/get-matches

# Com previsões do participante
curl -X GET "http://127.0.0.1:54321/functions/v1/get-matches?participant_id=550e8400-e29b-41d4-a716-446655440000"
```

---

## 4. Leaderboard

**Endpoint:** `GET /functions/v1/leaderboard`

### Descrição
Retorna o ranking atual de todos os participantes ordenado por posição (rank).

### Response de Sucesso (200)
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-id",
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "joao",
      "score": 45,
      "correct_count": 3,
      "correct_results": 2,
      "current_rank": 1,
      "previous_rank": 2,
      "created_at": "2026-05-15T10:30:00Z",
      "updated_at": "2026-05-15T11:00:00Z"
    },
    {
      "id": "uuid-id",
      "user_id": "660e8400-e29b-41d4-a716-446655440000",
      "username": "maria",
      "score": 40,
      "correct_count": 2,
      "correct_results": 3,
      "current_rank": 2,
      "previous_rank": 1,
      "created_at": "2026-05-15T10:30:00Z",
      "updated_at": "2026-05-15T11:00:00Z"
    }
  ],
  "message": "Leaderboard fetched successfully"
}
```

### Response de Erro (500)
```json
{
  "success": false,
  "data": null,
  "message": "Error fetching leaderboard"
}
```

### Exemplo de Uso
```bash
curl -X GET http://127.0.0.1:54321/functions/v1/leaderboard
```

---

## 5. Participant

**Endpoint:** `GET /functions/v1/participant?email=...`

### Descrição
Retorna os dados de um participante buscando pelo email.

### Query Parameters
- `email` (obrigatório): Email do participante a buscar

### Response de Sucesso (200)
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "joao",
    "email": "joao@example.com",
    "created_at": "2026-05-15T10:30:00Z"
  },
  "message": "Participant found"
}
```

### Respostas de Erro

**400 Bad Request** — Validação falhou
```json
{
  "success": false,
  "data": null,
  "message": "Invalid email format"
}
```

**404 Not Found** — Participante não encontrado
```json
{
  "success": false,
  "data": null,
  "message": "Participant not found"
}
```

**500 Internal Server Error**
```json
{
  "success": false,
  "data": null,
  "message": "Internal Server Error"
}
```

### Exemplo de Uso
```bash
curl -X GET "http://127.0.0.1:54321/functions/v1/participant?email=joao@example.com"
```

### HTTP Status Codes
- `200` — Success (GET bem-sucedido, UPDATE bem-sucedido)
- `201` — Created (POST com criação bem-sucedida)
- `400` — Bad Request (validação falhou)
- `404` — Not Found (recurso não encontrado)
- `405` — Method Not Allowed (método HTTP incorreto)
- `500` — Internal Server Error

---

## Testing Local

```bash
# Inicia o stack local
supabase start

# 1. Criar participante
curl -X POST http://127.0.0.1:54321/functions/v1/create-participant \
  -H "Content-Type: application/json" \
  -d '{"email": "teste@example.com"}'

# 2. Buscar participante
curl -X GET "http://127.0.0.1:54321/functions/v1/participant?email=teste@example.com"

# 3. Ver matches da rodada atual
curl -X GET http://127.0.0.1:54321/functions/v1/get-matches

# 4. Criar previsão
curl -X POST http://127.0.0.1:54321/functions/v1/create-prediction \
  -H "Content-Type: application/json" \
  -d '{
    "participant_id": "[UUID_DO_PARTICIPANTE]",
    "match_id": "[UUID_DO_MATCH]",
    "predicted_home_score": 2,
    "predicted_away_score": 1
  }'

# 5. Ver leaderboard
curl -X GET http://127.0.0.1:54321/functions/v1/leaderboard

# 6. Atualizar leaderboard
curl -X POST http://127.0.0.1:54321/functions/v1/update-leaderboard \
  -H "Content-Type: application/json"
```

### Ver logs das funções
```bash
supabase logs --service edge-function
```

### Debug no navegador
```
Chrome Dev Tools: localhost:8083
```
