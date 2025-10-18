-- Script para adicionar usuário administrador
-- Execute este script no phpMyAdmin

-- ===== ADICIONAR USUÁRIO ADMINISTRADOR =====
-- Verificar se o usuário já existe
SELECT id, email, role FROM users WHERE email = 'bragantini34@gmail.com';

-- Se não existir, criar o usuário
INSERT INTO users (
  name, 
  email, 
  password, 
  role, 
  status, 
  created_at, 
  updated_at
) VALUES (
  'Marcus Bragantini',
  'bragantini34@gmail.com',
  '$2a$12$j.KYlKq5yo4geX8kAooOHu3qUUCmTk7Y6WyI1fp48iE/5avVaEvp6', -- Hash da senha Mvb985674
  'admin',
  'active',
  NOW(),
  NOW()
) ON DUPLICATE KEY UPDATE 
  role = 'admin',
  status = 'active',
  updated_at = NOW();

-- Verificar se foi criado/atualizado
SELECT id, email, name, role, status FROM users WHERE email = 'bragantini34@gmail.com';

-- ===== ALTERNATIVA: ATUALIZAR USUÁRIO EXISTENTE =====
-- Se o usuário já existe, apenas atualizar o role
-- UPDATE users SET role = 'admin', status = 'active' WHERE email = 'bragantini34@gmail.com';
