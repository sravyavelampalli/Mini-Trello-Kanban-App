import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, MessageSquare } from "lucide-react";
import { format } from "date-fns";

interface KanbanCardProps {
  id: string;
  title: string;
  description?: string;
  labels?: Array<{ name: string; color: string }>;
  assignees?: Array<{ full_name: string }>;
  dueDate?: string;
  commentCount?: number;
  onClick?: () => void;
}

export function KanbanCard({
  id,
  title,
  description,
  labels = [],
  assignees = [],
  dueDate,
  commentCount = 0,
  onClick,
}: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-pointer bg-kanban-card p-3 shadow-sm transition-all hover:shadow-md"
      onClick={onClick}
    >
      {labels.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {labels.map((label, idx) => (
            <Badge
              key={idx}
              style={{ backgroundColor: label.color }}
              className="text-xs text-white"
            >
              {label.name}
            </Badge>
          ))}
        </div>
      )}

      <h4 className="mb-1 font-medium">{title}</h4>

      {description && (
        <p className="mb-2 line-clamp-2 text-sm text-muted-foreground">{description}</p>
      )}

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          {dueDate && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{format(new Date(dueDate), "MMM d")}</span>
            </div>
          )}
          {commentCount > 0 && (
            <div className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              <span>{commentCount}</span>
            </div>
          )}
        </div>

        {assignees.length > 0 && (
          <div className="flex -space-x-2">
            {assignees.slice(0, 3).map((assignee, idx) => (
              <Avatar key={idx} className="h-6 w-6 border-2 border-background">
                <AvatarFallback className="text-xs">
                  {assignee.full_name?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
