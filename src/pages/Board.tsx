import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Search } from "lucide-react";
import { KanbanList } from "@/components/KanbanList";
import { toast } from "sonner";

interface List {
  id: string;
  title: string;
  position: number;
}

interface Card {
  id: string;
  list_id: string;
  title: string;
  description: string | null;
  position: number;
  due_date: string | null;
  labels?: Array<{ name: string; color: string }>;
  assignees?: Array<{ full_name: string }>;
  commentCount?: number;
}

export default function Board() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [board, setBoard] = useState<any>(null);
  const [lists, setLists] = useState<List[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    if (boardId) {
      loadBoardData();
      setupRealtime();
    }
  }, [boardId]);

  const loadBoardData = async () => {
    try {
      const { data: boardData, error: boardError } = await supabase
        .from("boards")
        .select("*")
        .eq("id", boardId)
        .single();

      if (boardError) throw boardError;
      setBoard(boardData);

      const { data: listsData, error: listsError } = await supabase
        .from("lists")
        .select("*")
        .eq("board_id", boardId)
        .order("position");

      if (listsError) throw listsError;
      setLists(listsData || []);

      const { data: cardsData, error: cardsError } = await supabase
        .from("cards")
        .select(
          `
          *,
          card_labels (name, color),
          card_assignees (
            profiles (full_name)
          )
        `
        )
        .in(
          "list_id",
          listsData?.map((l) => l.id) || []
        )
        .order("position");

      if (cardsError) throw cardsError;

      const processedCards = cardsData?.map((card: any) => ({
        ...card,
        labels: card.card_labels || [],
        assignees: card.card_assignees?.map((a: any) => a.profiles) || [],
      }));

      setCards(processedCards || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load board");
    } finally {
      setLoading(false);
    }
  };

  const setupRealtime = () => {
    const channel = supabase
      .channel("board-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cards",
        },
        () => {
          loadBoardData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lists",
        },
        () => {
          loadBoardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleAddList = async () => {
    const title = prompt("List name:");
    if (!title) return;

    const maxPosition = lists.length > 0 ? Math.max(...lists.map((l) => l.position)) : 0;

    try {
      const { error } = await supabase.from("lists").insert({
        board_id: boardId,
        title,
        position: maxPosition + 1024,
      });

      if (error) throw error;
      toast.success("List created!");
    } catch (error: any) {
      toast.error(error.message || "Failed to create list");
    }
  };

  const handleAddCard = async (listId: string) => {
    const title = prompt("Card title:");
    if (!title) return;

    const listCards = cards.filter((c) => c.list_id === listId);
    const maxPosition = listCards.length > 0 ? Math.max(...listCards.map((c) => c.position)) : 0;

    try {
      const { error } = await supabase.from("cards").insert({
        list_id: listId,
        title,
        position: maxPosition + 1024,
        created_by: user?.id,
      });

      if (error) throw error;
      toast.success("Card created!");
    } catch (error: any) {
      toast.error(error.message || "Failed to create card");
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeCard = cards.find((c) => c.id === activeId);
    const overCard = cards.find((c) => c.id === overId);

    if (!activeCard) return;

    const activeListId = activeCard.list_id;
    const overListId = overCard ? overCard.list_id : overId;

    if (activeListId !== overListId) {
      setCards((cards) => {
        const activeIndex = cards.findIndex((c) => c.id === activeId);
        const overIndex = overCard ? cards.findIndex((c) => c.id === overId) : cards.length;

        const updatedCards = [...cards];
        updatedCards[activeIndex] = { ...updatedCards[activeIndex], list_id: overListId };

        return arrayMove(updatedCards, activeIndex, overIndex);
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeCard = cards.find((c) => c.id === activeId);
    const overCard = cards.find((c) => c.id === overId);

    if (!activeCard) return;

    const targetListId = overCard ? overCard.list_id : overId;
    const listCards = cards.filter((c) => c.list_id === targetListId);
    const targetIndex = overCard ? listCards.findIndex((c) => c.id === overId) : listCards.length;

    let newPosition: number;
    if (targetIndex === 0) {
      newPosition = listCards[0] ? listCards[0].position / 2 : 1024;
    } else if (targetIndex === listCards.length) {
      newPosition = listCards[listCards.length - 1]
        ? listCards[listCards.length - 1].position + 1024
        : 1024;
    } else {
      const prevPos = listCards[targetIndex - 1]?.position || 0;
      const nextPos = listCards[targetIndex]?.position || prevPos + 2048;
      newPosition = (prevPos + nextPos) / 2;
    }

    try {
      const { error } = await supabase
        .from("cards")
        .update({
          list_id: targetListId,
          position: newPosition,
        })
        .eq("id", activeId);

      if (error) throw error;

      await supabase.from("activity_logs").insert({
        board_id: boardId,
        user_id: user?.id,
        action: "moved_card",
        entity_type: "card",
        entity_id: activeId,
        metadata: { from_list: activeCard.list_id, to_list: targetListId },
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to move card");
      loadBoardData();
    }
  };

  const filteredCards = searchQuery
    ? cards.filter((card) => card.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : cards;

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="flex h-screen flex-col bg-kanban-bg">
      <header className="flex items-center justify-between border-b bg-card/50 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">{board?.title}</h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search cards..."
              className="w-64 pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 pb-4">
            {lists.map((list) => (
              <KanbanList
                key={list.id}
                id={list.id}
                title={list.title}
                cards={filteredCards.filter((card) => card.list_id === list.id)}
                onAddCard={() => handleAddCard(list.id)}
                onCardClick={(card) => console.log("Card clicked:", card)}
              />
            ))}

            <Button
              variant="secondary"
              className="h-auto w-80 flex-shrink-0 justify-start gap-2 p-3"
              onClick={handleAddList}
            >
              <Plus className="h-4 w-4" />
              Add list
            </Button>
          </div>
        </DndContext>
      </main>
    </div>
  );
}
