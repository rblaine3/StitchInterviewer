import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Project } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProjectModal from "@/components/project/project-modal";
import DeleteProjectDialog from "@/components/project/delete-project-dialog";
import { queryClient } from "@/lib/queryClient";
import { ArrowLeft, Edit, Trash, Loader2, Code, BellIcon, User, LogOut } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function ProjectDetailPage() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const projectId = parseInt(params.id);
  const { user, logoutMutation } = useAuth();
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const { data: project, isLoading, error } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch project");
      }
      return response.json();
    },
  });

  const handleEditProject = () => {
    setIsEditModalOpen(true);
  };

  const handleDeleteProject = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleBackToDashboard = () => {
    setLocation("/");
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const refreshProject = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Error</h1>
          <p className="text-gray-600 mt-2">
            {error ? error.message : "Project not found"}
          </p>
          <Button variant="outline" className="mt-4" onClick={handleBackToDashboard}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

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
                <button 
                  onClick={handleBackToDashboard}
                  className="text-gray-900 inline-flex items-center px-1 pt-1 text-sm font-medium hover:text-primary"
                >
                  Dashboard
                </button>
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
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <Button 
                  variant="ghost" 
                  className="inline-flex items-center text-sm font-medium text-primary hover:text-primary/80 p-0 mb-2"
                  onClick={handleBackToDashboard}
                >
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Back to Dashboard
                </Button>
                <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                <p className="mt-1 text-sm text-gray-500">{project.description}</p>
              </div>
              <div className="flex items-center space-x-3">
                <Button variant="outline" size="sm" onClick={handleEditProject}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" className="text-red-700" onClick={handleDeleteProject}>
                  <Trash className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
          
          {/* Project Tabs */}
          <Tabs defaultValue="research-plan" className="mt-6">
            <TabsList className="border-b border-gray-200 w-full justify-start">
              <TabsTrigger value="research-plan">Research Plan</TabsTrigger>
              <TabsTrigger value="test-interview">Test Interview</TabsTrigger>
              <TabsTrigger value="share">Share</TabsTrigger>
              <TabsTrigger value="transcripts">Transcripts</TabsTrigger>
            </TabsList>
            
            {/* Tab contents */}
            <TabsContent value="research-plan" className="py-6">
              <Card>
                <CardHeader>
                  <CardTitle>Research Plan</CardTitle>
                  <CardDescription>Plan your research goals and approach.</CardDescription>
                </CardHeader>
                <CardContent className="text-center py-12 text-gray-500">
                  Research Plan content will be implemented in future updates.
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="test-interview" className="py-6">
              <Card>
                <CardHeader>
                  <CardTitle>Test Interview</CardTitle>
                  <CardDescription>Conduct interview sessions with AI assistance.</CardDescription>
                </CardHeader>
                <CardContent className="text-center py-12 text-gray-500">
                  Test Interview functionality will be implemented in future updates.
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="share" className="py-6">
              <Card>
                <CardHeader>
                  <CardTitle>Share</CardTitle>
                  <CardDescription>Share your project with team members or clients.</CardDescription>
                </CardHeader>
                <CardContent className="text-center py-12 text-gray-500">
                  Sharing functionality will be implemented in future updates.
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="transcripts" className="py-6">
              <Card>
                <CardHeader>
                  <CardTitle>Transcripts</CardTitle>
                  <CardDescription>View and analyze interview transcripts.</CardDescription>
                </CardHeader>
                <CardContent className="text-center py-12 text-gray-500">
                  Transcript functionality will be implemented in future updates.
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Modals */}
      <ProjectModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        project={project}
        onSuccess={() => {
          refreshProject();
        }}
      />
      
      <DeleteProjectDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        project={project}
        onSuccess={() => {
          handleBackToDashboard();
        }}
      />
    </div>
  );
}
