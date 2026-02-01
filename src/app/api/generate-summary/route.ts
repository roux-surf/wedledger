import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(request: Request) {
  try {
    const { clientId } = await request.json();

    if (!clientId) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch client data
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('user_id', user.id)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Fetch budget
    const { data: budget, error: budgetError } = await supabase
      .from('budgets')
      .select('*')
      .eq('client_id', clientId)
      .single();

    if (budgetError || !budget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
    }

    // Fetch categories
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .eq('budget_id', budget.id)
      .order('sort_order', { ascending: true });

    if (categoriesError) {
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
    }

    // Calculate totals for each category
    const categoryData = await Promise.all(
      (categories || []).map(async (category) => {
        const { data: lineItems } = await supabase
          .from('line_items')
          .select('actual_cost')
          .eq('category_id', category.id);

        const actualSpend = (lineItems || []).reduce(
          (sum, item) => sum + (Number(item.actual_cost) || 0),
          0
        );

        const targetAmount = Number(category.target_amount) || 0;
        const difference = targetAmount - actualSpend;

        return {
          name: category.name,
          target: targetAmount,
          actual: actualSpend,
          difference,
          status: difference >= 0 ? 'under' : 'over',
        };
      })
    );

    const totalBudget = Number(client.total_budget) || 0;
    const totalSpent = categoryData.reduce((sum, cat) => sum + cat.actual, 0);
    const totalRemaining = totalBudget - totalSpent;

    // Build category breakdown string
    const categoryBreakdown = categoryData
      .map((cat) => {
        const statusText = cat.difference >= 0 ? 'under budget' : 'over budget';
        return `- ${cat.name}: Target $${cat.target.toLocaleString()}, Actual $${cat.actual.toLocaleString()} (${Math.abs(cat.difference).toLocaleString()} ${statusText})`;
      })
      .join('\n');

    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'AI summary is not configured. Please add ANTHROPIC_API_KEY to environment variables.' },
        { status: 500 }
      );
    }

    // Generate summary using Claude
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const prompt = `Generate a brief, professional budget summary for a wedding client.

Budget Overview:
- Total Budget: $${totalBudget.toLocaleString()}
- Total Spent: $${totalSpent.toLocaleString()}
- Remaining: $${totalRemaining.toLocaleString()} ${totalRemaining >= 0 ? '(under budget)' : '(over budget)'}

Category Breakdown:
${categoryBreakdown}

Write 1-2 short paragraphs summarizing the budget status. Use a conversational, friendly tone — approachable and reassuring, like a trusted advisor chatting with their client. Focus on the facts - do not include recommendations, forecasts, or vendor suggestions. Do NOT include any headings, titles, or markdown formatting — just plain text paragraphs. The summary should be suitable for displaying directly in a client dashboard.`;

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const summary =
      message.content[0].type === 'text' ? message.content[0].text : 'Failed to generate summary';

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Error generating summary:', error);
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
  }
}
