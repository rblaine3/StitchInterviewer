import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, MessagesSquare, Lightbulb, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ResearchPlanProps {
  projectId: number;
}

export default function ResearchPlan({ projectId }: ResearchPlanProps) {
  const { toast } = useToast();
  const [files, setFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [researchObjective, setResearchObjective] = useState("");
  const [interviewPrompt, setInterviewPrompt] = useState("");

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(e.target.files);
    }
  };

  // Handle file upload
  const handleUpload = async () => {
    if (!files || files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one file to upload",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }
      formData.append("projectId", projectId.toString());

      // This endpoint would need to be implemented on the backend
      const response = await fetch("/api/upload-research-materials", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to upload files");
      }

      toast({
        title: "Upload successful",
        description: "Research materials have been uploaded",
      });

      // Reset file input
      setFiles(null);
      // Reset the file input element
      const fileInput = document.getElementById("research-files") as HTMLInputElement;
      if (fileInput) {
        fileInput.value = "";
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

  // Use TanStack Query mutation for the AI prompt enhancement
  const enhancePromptMutation = useMutation({
    mutationFn: async (objective: string) => {
      const response = await apiRequest("POST", "/api/enhance-prompt", {
        objective,
        projectId,
      });
      if (!response.ok) {
        throw new Error("Failed to enhance prompt");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setInterviewPrompt(data.enhancedPrompt);
      toast({
        title: "Prompt enhanced",
        description: "Your research objective has been transformed into an interview prompt",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Enhancement failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEnhancePrompt = () => {
    if (!researchObjective.trim()) {
      toast({
        title: "Research objective required",
        description: "Please enter a research objective to enhance",
        variant: "destructive",
      });
      return;
    }

    enhancePromptMutation.mutate(researchObjective);
  };

  return (
    <div className="space-y-6">
      {/* Knowledge Base Upload Section */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <FileText className="mr-2 h-5 w-5 text-primary" />
            Knowledge Base
          </CardTitle>
          <CardDescription>
            Upload materials related to your project for context and background information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="research-files">Upload Files</Label>
            <Input
              id="research-files"
              type="file"
              multiple
              onChange={handleFileChange}
              className="cursor-pointer"
            />
            <p className="text-xs text-gray-500">
              Supported formats: PDF, DOCX, TXT, etc. (Max 10MB per file)
            </p>
          </div>

          <Button
            onClick={handleUpload}
            disabled={isUploading || !files || files.length === 0}
            className="flex items-center"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Files
              </>
            )}
          </Button>

          {/* File list would go here - this is a placeholder for now */}
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Uploaded Materials</h4>
            <div className="text-sm text-gray-500 italic">
              No materials uploaded yet
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Research Objectives Section */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <MessagesSquare className="mr-2 h-5 w-5 text-primary" />
            Research Objectives
          </CardTitle>
          <CardDescription>
            Define your research goals and create an interview prompt
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="research-objective">Research Objective</Label>
            <Textarea
              id="research-objective"
              placeholder="Describe what you want to learn or understand from your interviews..."
              value={researchObjective}
              onChange={(e) => setResearchObjective(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          <Button
            onClick={handleEnhancePrompt}
            disabled={enhancePromptMutation.isPending || !researchObjective.trim()}
            className="flex items-center"
            variant="outline"
          >
            {enhancePromptMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enhancing...
              </>
            ) : (
              <>
                <Lightbulb className="mr-2 h-4 w-4" />
                Suggest a Prompt
              </>
            )}
          </Button>

          <div className="space-y-2 mt-4">
            <Label htmlFor="interview-prompt">Interview Prompt</Label>
            <Textarea
              id="interview-prompt"
              placeholder="Your enhanced interview prompt will appear here..."
              value={interviewPrompt}
              onChange={(e) => setInterviewPrompt(e.target.value)}
              className="min-h-[200px]"
            />
            <p className="text-xs text-gray-500">
              This prompt will guide the AI interviewer during conversation with respondents
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}