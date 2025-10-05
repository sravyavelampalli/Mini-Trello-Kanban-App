import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal } from "lucide-react";
import { KanbanCard } from "./KanbanCard";

interface CardData {
  id: string;
  title: string;
  description?: string;
  labels?: Array<{ name: string; color: string }>;
  assignees?: Array<{ full_name: string }>;
  due_date?: string;
  commentCount?: number;
}

interface KanbanListProps {
  id: string;
  title: string;
  cards: CardData[];
  onAddCard: () => void;
  onCardClick: (card: CardData) => void;
}

export function KanbanList({ id, title, cards, onAddCard, onCardClick }: KanbanListProps) {
  const { setNodeRef } = useDroppable({ id });
  const cardIds = cards.map((card) => card.id);

  return (
    <Card className="flex w-80 flex-shrink-0 flex-col bg-kanban-list shadow-sm">
      <div className="flex items-center justify-between border-b p-3">
        <h3 className="font-semibold">{title}</h3>
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground">{cards.length}</span>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div ref={setNodeRef} className="flex-1 space-y-2 overflow-y-auto p-3">
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <KanbanCard
              key={card.id}
              id={card.id}
              title={card.title}
              description={card.description}
              labels={card.labels}
              assignees={card.assignees}
              dueDate={card.due_date}
              commentCount={card.commentCount}
              onClick={() => onCardClick(card)}
            />
          ))}
        </SortableContext>

        <Button variant="ghost" className="w-full justify-start gap-2" onClick={onAddCard}>
          <Plus className="h-4 w-4" />
          Add card
        </Button>
      </div>
    </Card>
  );
}
