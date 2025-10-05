import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Trello, CheckSquare, Users, Zap } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10">
      <header className="container mx-auto flex items-center justify-between p-6">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <Trello className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold">Kanban</span>
        </div>
        <Button onClick={() => navigate("/auth")} className="shadow-md">
          Get Started
        </Button>
      </header>

      <main className="container mx-auto px-6 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="mb-6 bg-gradient-primary bg-clip-text text-6xl font-bold text-transparent">
            Organize Your Work
            <br />
            Like a Pro
          </h1>
          <p className="mb-8 text-xl text-muted-foreground">
            A powerful Kanban board with real-time collaboration, drag-and-drop cards, and
            beautiful design. Built for teams that move fast.
          </p>
          <Button onClick={() => navigate("/auth")} size="lg" className="shadow-lg">
            Start For Free
          </Button>
        </div>

        <div className="mx-auto mt-20 grid max-w-5xl gap-8 md:grid-cols-3">
          <div className="rounded-2xl border bg-card/50 p-6 backdrop-blur-sm transition-all hover:shadow-lg">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-primary">
              <CheckSquare className="h-6 w-6 text-white" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">Drag & Drop</h3>
            <p className="text-muted-foreground">
              Intuitive drag-and-drop interface to organize tasks effortlessly
            </p>
          </div>

          <div className="rounded-2xl border bg-card/50 p-6 backdrop-blur-sm transition-all hover:shadow-lg">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-primary">
              <Users className="h-6 w-6 text-white" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">Real-time Collaboration</h3>
            <p className="text-muted-foreground">
              See updates instantly as your team works together
            </p>
          </div>

          <div className="rounded-2xl border bg-card/50 p-6 backdrop-blur-sm transition-all hover:shadow-lg">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-primary">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">Lightning Fast</h3>
            <p className="text-muted-foreground">
              Built for speed with modern tech and beautiful animations
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
