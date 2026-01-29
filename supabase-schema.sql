-- WedLedger Database Schema
-- Run this SQL in your Supabase SQL Editor to set up the database

-- =============================================
-- TABLES
-- =============================================

-- Clients table
-- Stores wedding client information for each coordinator
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  wedding_date DATE NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  guest_count INTEGER NOT NULL,
  total_budget DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budgets table (1:1 relationship with clients)
-- Each client has exactly one budget
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories table
-- Budget categories like Venue, Catering, etc.
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  target_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Line items table
-- Individual vendors/expenses within each category
CREATE TABLE line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  vendor_name TEXT NOT NULL,
  estimated_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  actual_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  paid_to_date DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_clients_user_id ON clients(user_id);
CREATE INDEX idx_budgets_client_id ON budgets(client_id);
CREATE INDEX idx_categories_budget_id ON categories(budget_id);
CREATE INDEX idx_line_items_category_id ON line_items(category_id);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on all tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_items ENABLE ROW LEVEL SECURITY;

-- =============================================
-- CLIENTS POLICIES
-- Users can only access their own clients
-- =============================================

CREATE POLICY "Users can view own clients" ON clients
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clients" ON clients
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clients" ON clients
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own clients" ON clients
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- BUDGETS POLICIES
-- Access via client ownership
-- =============================================

CREATE POLICY "Users can view own budgets" ON budgets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = budgets.client_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own budgets" ON budgets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = budgets.client_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own budgets" ON budgets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = budgets.client_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own budgets" ON budgets
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = budgets.client_id
      AND clients.user_id = auth.uid()
    )
  );

-- =============================================
-- CATEGORIES POLICIES
-- Access via budget -> client ownership chain
-- =============================================

CREATE POLICY "Users can view own categories" ON categories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM budgets
      JOIN clients ON clients.id = budgets.client_id
      WHERE budgets.id = categories.budget_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own categories" ON categories
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM budgets
      JOIN clients ON clients.id = budgets.client_id
      WHERE budgets.id = categories.budget_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own categories" ON categories
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM budgets
      JOIN clients ON clients.id = budgets.client_id
      WHERE budgets.id = categories.budget_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own categories" ON categories
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM budgets
      JOIN clients ON clients.id = budgets.client_id
      WHERE budgets.id = categories.budget_id
      AND clients.user_id = auth.uid()
    )
  );

-- =============================================
-- LINE ITEMS POLICIES
-- Access via category -> budget -> client ownership chain
-- =============================================

CREATE POLICY "Users can view own line_items" ON line_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM categories
      JOIN budgets ON budgets.id = categories.budget_id
      JOIN clients ON clients.id = budgets.client_id
      WHERE categories.id = line_items.category_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own line_items" ON line_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM categories
      JOIN budgets ON budgets.id = categories.budget_id
      JOIN clients ON clients.id = budgets.client_id
      WHERE categories.id = line_items.category_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own line_items" ON line_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM categories
      JOIN budgets ON budgets.id = categories.budget_id
      JOIN clients ON clients.id = budgets.client_id
      WHERE categories.id = line_items.category_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own line_items" ON line_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM categories
      JOIN budgets ON budgets.id = categories.budget_id
      JOIN clients ON clients.id = budgets.client_id
      WHERE categories.id = line_items.category_id
      AND clients.user_id = auth.uid()
    )
  );
