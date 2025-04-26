import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Project } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import ProjectCard from "@/components/project/project-card";
import ProjectModal from "@/components/project/project-modal";
import DeleteProjectDialog from "@/components/project/delete-project-dialog";
import { Button } from "@/components/ui/button";
import { Code, Loader2, LogOut, PlusCircle, BellIcon, User } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { queryClient } from "@/lib/queryClient";

export default function DashboardPage() {
  const { user, logoutMutation } = useAuth();
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  
  const { data: projects, isLoading: isLoadingProjects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const handleCreateProject = () => {
    setProjectToEdit(null);
    setIsProjectModalOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setProjectToEdit(project);
    setIsProjectModalOpen(true);
  };

  const handleDeleteProject = (project: Project) => {
    setProjectToDelete(project);
    setIsDeleteDialogOpen(true);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const refreshProjects = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <Code className="h-8 w-8 text-primary" />
                <span className="ml-2 text-xl font-bold text-gray-900">StitchAI</span>
              </div>
              <nav className="hidden md:ml-6 md:flex md:space-x-8">
                <span className="border-primary text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Dashboard
                </span>
              </nav>
            </div>
            <div className="flex items-center">
              <div className="flex items-center space-x-4">
                <button className="bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                  <span className="sr-only">View notifications</span>
                  <BellIcon className="h-6 w-6" />
                </button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <User className="h-6 w-6" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="flex items-center">
                      <span className="text-sm font-medium">{user?.username}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sign out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Your Projects</h1>
            <Button onClick={handleCreateProject}>
              <PlusCircle className="mr-2 h-5 w-5" />
              New Project
            </Button>
          </div>
          
          {/* Project Grid */}
          {isLoadingProjects ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : projects && projects.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onEdit={() => handleEditProject(project)}
                  onDelete={() => handleDeleteProject(project)}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white overflow-hidden shadow rounded-lg p-6 text-center">
              <PlusCircle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No projects</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new project.</p>
              <div className="mt-6">
                <Button onClick={handleCreateProject}>
                  <PlusCircle className="mr-2 h-5 w-5" />
                  New Project
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ProjectModal
        open={isProjectModalOpen}
        onOpenChange={setIsProjectModalOpen}
        project={projectToEdit}
        onSuccess={refreshProjects}
      />
      
      <DeleteProjectDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        project={projectToDelete}
        onSuccess={refreshProjects}
      />
    </div>
  );
}
