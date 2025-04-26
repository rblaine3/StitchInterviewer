import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ResearchMaterial, Project } from "@shared/schema";
import { Upload, Trash2, Loader2, FileText, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ResearchPlanProps {
  projectId: number | undefined;
}

export default function ResearchPlan({ projectId }: ResearchPlanProps) {
  // Early guard for undefined projectId
  const actualProjectId = projectId || 0;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [objective, setObjective] = useState<string | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);

  // Fetch the current project
  const { data: project, isLoading: isLoadingProject } = useQuery<Project>({
    queryKey: ["/api/projects", actualProjectId],
    enabled: actualProjectId > 0, // Only run if we have a valid project ID
  });
  
  // Effect to update objective when project data loads
  useEffect(() => {
    if (project) {
      // Always update the objective from the project
      setObjective(project.researchObjective || '');
    }
  }, [project]);

  // Fetch research materials for the project
  const { data: materials, isLoading: isLoadingMaterials } = useQuery<ResearchMaterial[]>({
    queryKey: ["/api/projects", actualProjectId, "research-materials"],
    enabled: actualProjectId > 0, // Only run if we have a valid project ID
    queryFn: async () => {
      const response = await fetch(`/api/projects/${actualProjectId}/research-materials`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch research materials");
      }
      return response.json();
    },
  });

  // Delete research material mutation
  const deleteMaterialMutation = useMutation({
    mutationFn: async (materialId: number) => {
      if (actualProjectId <= 0) {
        throw new Error("Project ID is invalid");
      }
      
      await apiRequest("DELETE", `/api/research-materials/${materialId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", actualProjectId, "research-materials"] });
      toast({
        title: "Material deleted",
        description: "The material has been removed from your project",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete material",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update research objective mutation
  const updateObjectiveMutation = useMutation({
    mutationFn: async (objective: string) => {
      if (actualProjectId <= 0) {
        throw new Error("Project ID is invalid");
      }
      
      const response = await apiRequest("PATCH", `/api/projects/${actualProjectId}/research-objective`, {
        objective,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", actualProjectId] });
      toast({
        title: "Research objective updated",
        description: "Your research objective has been saved",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update objective",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Enhance prompt mutation
  const enhancePromptMutation = useMutation({
    mutationFn: async ({ objective, useKnowledgeBase }: { objective: string, useKnowledgeBase: boolean }) => {
      if (actualProjectId <= 0) {
        throw new Error("Project ID is invalid");
      }
      
      setIsEnhancing(true);
      const response = await apiRequest("POST", "/api/enhance-prompt", {
        projectId: actualProjectId,
        objective,
        useKnowledgeBase,
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Set the objective to the enhanced prompt to update the text box directly
      setObjective(data.prompt);
      
      // Also update in database
      queryClient.invalidateQueries({ queryKey: ["/api/projects", actualProjectId] });
      
      toast({
        title: "Prompt enhanced",
        description: "Your interview prompt has been enhanced with AI assistance",
      });
      setIsEnhancing(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to enhance prompt",
        description: error.message,
        variant: "destructive",
      });
      setIsEnhancing(false);
    },
  });

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    if (actualProjectId <= 0) {
      toast({
        title: "Error",
        description: "Project ID is invalid",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append("projectId", actualProjectId.toString());
      
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }
      
      const response = await fetch("/api/upload-research-materials", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Upload failed");
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/projects", actualProjectId, "research-materials"] });
      
      toast({
        title: "Files uploaded",
        description: `Successfully uploaded ${files.length} file(s)`,
      });
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload files",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle objective change
  const handleSaveObjective = () => {
    // Use the current objective or fallback to project.researchObjective
    const currentObjective = objective ?? project?.researchObjective ?? "";
    
    if (!currentObjective.trim()) {
      toast({
        title: "Error",
        description: "Please enter a research objective before saving",
        variant: "destructive",
      });
      return;
    }
    
    // Update in database
    updateObjectiveMutation.mutate(currentObjective);
  };

  // Add state for using knowledge base
  const [useKnowledgeBase, setUseKnowledgeBase] = useState(true);

  // Handle enhance prompt
  const handleEnhancePrompt = () => {
    enhancePromptMutation.mutate({
      objective: objective || (project?.researchObjective || ""),
      useKnowledgeBase
    });
  };

  if (isLoadingProject) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Knowledge Base and Research Objective Side by Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Knowledge Base Section */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Knowledge Base</CardTitle>
            <CardDescription>
              Upload documents, images, or any materials related to your research
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* File Upload */}
              <div>
                <Label htmlFor="file-upload" className="block mb-2">
                  Upload Files
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    ref={fileInputRef}
                    id="file-upload"
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="flex-1"
                    disabled={isUploading}
                  />
                  <Button variant="outline" size="icon" disabled={isUploading}>
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Accepted file types: PDF, DOCX, TXT, JPG, PNG, etc. (max 10MB)
                </p>
              </div>

              {/* Uploaded Files */}
              <div className="mt-6">
                <h3 className="font-medium mb-3">Uploaded Materials</h3>
                {isLoadingMaterials ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  </div>
                ) : materials && materials.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-auto">
                    {materials.map((material) => (
                      <div
                        key={material.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-gray-500" />
                          <div>
                            <p className="font-medium text-sm">{material.fileName}</p>
                            <p className="text-xs text-gray-500">
                              {(material.fileSize / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMaterialMutation.mutate(material.id)}
                          disabled={deleteMaterialMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    No materials uploaded yet
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Research Objective Section */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Research Objective</CardTitle>
            <CardDescription>
              Define what you want to learn from your interviews
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Textarea
                placeholder="E.g., I want to understand user experiences with online food delivery services, focusing on delivery time satisfaction, problems encountered, and features they wish existed..."
                className="min-h-40"
                value={objective || project?.researchObjective || ""}
                onChange={(e) => setObjective(e.target.value)}
              />
              
              <div className="flex items-center space-x-2 mb-4">
                <input
                  type="checkbox"
                  id="use-knowledge-base"
                  checked={useKnowledgeBase}
                  onChange={(e) => setUseKnowledgeBase(e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="use-knowledge-base" className="text-sm">
                  Use knowledge base to enhance prompt
                </Label>
              </div>
              
              <div className="flex justify-between">
                <Button variant="outline" onClick={handleSaveObjective}>
                  Save Objective
                </Button>
                <Button
                  variant="default"
                  className="gap-2"
                  onClick={handleEnhancePrompt}
                  disabled={isEnhancing}
                >
                  {isEnhancing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Enhance My Prompt
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Interview Prompt Preview Section */}
      {project?.interviewPrompt && (
        <Card>
          <CardHeader>
            <CardTitle>AI-Enhanced Interview Prompt</CardTitle>
            <CardDescription>
              Use this structured prompt template for your interviews
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <div
                dangerouslySetInnerHTML={{
                  __html: project.interviewPrompt.replace(/\n/g, "<br />").replace(
                    /## (.*?)$/gm,
                    "<h3>$1</h3>"
                  ),
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}