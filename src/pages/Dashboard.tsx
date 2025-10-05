import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, LogOut, Trello, Folder } from "lucide-react";
import { toast } from "sonner";

interface Workspace {
  id: string;
  name: string;
  description: string | null;
}

interface Board {
  id: string;
  title: string;
  description: string | null;
  workspace_id: string;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);
  const [createBoardOpen, setCreateBoardOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);

  const [workspaceForm, setWorkspaceForm] = useState({
    name: "",
    description: "",
  });

  const [boardForm, setBoardForm] = useState({
    title: "",
    description: "",
  });

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const { data: workspacesData, error: workspacesError } = await supabase
        .from("workspaces")
        .select("*")
        .order("created_at", { ascending: false });

      if (workspacesError) throw workspacesError;
      setWorkspaces(workspacesData || []);

      if (workspacesData && workspacesData.length > 0) {
        setSelectedWorkspace(workspacesData[0].id);
      }

      const { data: boardsData, error: boardsError } = await supabase
        .from("boards")
        .select("*")
        .order("created_at", { ascending: false });

      if (boardsError) throw boardsError;
      setBoards(boardsData || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("workspaces").insert({
        name: workspaceForm.name,
        description: workspaceForm.description,
        owner_id: user?.id,
      });

      if (error) throw error;
      toast.success("Workspace created!");
      setCreateWorkspaceOpen(false);
      setWorkspaceForm({ name: "", description: "" });
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to create workspace");
    }
  };

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkspace) {
      toast.error("Please select a workspace first");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("boards")
        .insert({
          title: boardForm.title,
          description: boardForm.description,
          workspace_id: selectedWorkspace,
          owner_id: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add owner as a board member with admin role
      await supabase.from("board_members").insert({
        board_id: data.id,
        user_id: user?.id,
        role: "admin",
      });

      toast.success("Board created!");
      setCreateBoardOpen(false);
      setBoardForm({ title: "", description: "" });
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to create board");
    }
  };

  const filteredBoards = selectedWorkspace
    ? boards.filter((board) => board.workspace_id === selectedWorkspace)
    : boards;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
              <Trello className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold">Kanban</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Your Workspaces</h2>
            <p className="text-muted-foreground">Organize your boards by workspace</p>
          </div>
          <Dialog open={createWorkspaceOpen} onOpenChange={setCreateWorkspaceOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Workspace
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Workspace</DialogTitle>
                <DialogDescription>Add a new workspace to organize your boards</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateWorkspace} className="space-y-4">
                <div>
                  <Label htmlFor="workspace-name">Workspace Name</Label>
                  <Input
                    id="workspace-name"
                    value={workspaceForm.name}
                    onChange={(e) => setWorkspaceForm({ ...workspaceForm, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="workspace-description">Description (optional)</Label>
                  <Input
                    id="workspace-description"
                    value={workspaceForm.description}
                    onChange={(e) => setWorkspaceForm({ ...workspaceForm, description: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full">
                  Create Workspace
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center">Loading...</div>
        ) : workspaces.length === 0 ? (
          <Card className="py-12 text-center">
            <CardHeader>
              <Folder className="mx-auto h-12 w-12 text-muted-foreground" />
              <CardTitle>No workspaces yet</CardTitle>
              <CardDescription>Create your first workspace to get started</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="space-y-8">
            {workspaces.map((workspace) => (
              <div key={workspace.id}>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">{workspace.name}</h3>
                    {workspace.description && (
                      <p className="text-sm text-muted-foreground">{workspace.description}</p>
                    )}
                  </div>
                  <Dialog open={createBoardOpen} onOpenChange={setCreateBoardOpen}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        onClick={() => setSelectedWorkspace(workspace.id)}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        New Board
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create Board</DialogTitle>
                        <DialogDescription>Add a new board to {workspace.name}</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleCreateBoard} className="space-y-4">
                        <div>
                          <Label htmlFor="board-title">Board Title</Label>
                          <Input
                            id="board-title"
                            value={boardForm.title}
                            onChange={(e) => setBoardForm({ ...boardForm, title: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="board-description">Description (optional)</Label>
                          <Input
                            id="board-description"
                            value={boardForm.description}
                            onChange={(e) =>
                              setBoardForm({ ...boardForm, description: e.target.value })
                            }
                          />
                        </div>
                        <Button type="submit" className="w-full">
                          Create Board
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {boards
                    .filter((board) => board.workspace_id === workspace.id)
                    .map((board) => (
                      <Card
                        key={board.id}
                        className="cursor-pointer transition-all hover:shadow-lg hover:shadow-primary/20"
                        onClick={() => navigate(`/board/${board.id}`)}
                      >
                        <CardHeader>
                          <CardTitle className="text-lg">{board.title}</CardTitle>
                          {board.description && (
                            <CardDescription className="line-clamp-2">
                              {board.description}
                            </CardDescription>
                          )}
                        </CardHeader>
                      </Card>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
