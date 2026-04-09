import { DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useCategories } from '@/lib/api/budget-api';
import { useParams } from 'react-router-dom';
import { useIntl } from 'react-intl';

interface CategoryListProps {
  budgetId: string;
}

export function CategoryList({ budgetId }: CategoryListProps) {
  const { formatMessage } = useIntl();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { data: categories, isLoading } = useCategories(workspaceId!, budgetId);

  if (isLoading) {
    return <div className="text-center text-muted-foreground py-8">{formatMessage({ id: 'budget.categories.loading' })}</div>;
  }

  if (!categories || categories.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <DollarSign className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">{formatMessage({ id: 'budget.categories.empty.title' })}</h3>
          <p className="text-muted-foreground text-center">
            {formatMessage({ id: 'budget.categories.empty.description' })}
          </p>
        </CardContent>
      </Card>
    );
  }

  return null; // Categories shown in the parent component (BudgetDetails)
}
