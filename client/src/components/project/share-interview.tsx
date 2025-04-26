import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Copy, Share, Check } from "lucide-react";

interface ShareInterviewProps {
  projectId: number;
}

export default function ShareInterview({ projectId }: ShareInterviewProps) {
  const { toast } = useToast();
  const [shareableLink, setShareableLink] = useState<string>("");
  const [isLinkCopied, setIsLinkCopied] = useState(false);

  // Generate a shareable link
  const generateLinkMutation = useMutation({
    mutationFn: async () => {
      // Validate project ID
      if (!projectId) {
        throw new Error("Project ID is missing or invalid");
      }
      
      console.log("Generating shareable link for project ID:", projectId);
      
      const response = await apiRequest(
        "POST",
        `/api/projects/${projectId}/share`
      );
      return response.json();
    },
    onSuccess: (data) => {
      // Create a complete URL with the callId
      const baseUrl = window.location.origin;
      const shareUrl = `${baseUrl}/interview/${data.callId}`;
      setShareableLink(shareUrl);
      toast({
        title: "Shareable link generated",
        description: "You can now share this link with participants",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to generate shareable link",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Copy link to clipboard
  const copyToClipboard = () => {
    if (!shareableLink) return;
    
    navigator.clipboard.writeText(shareableLink)
      .then(() => {
        setIsLinkCopied(true);
        setTimeout(() => setIsLinkCopied(false), 2000);
        toast({
          title: "Link copied",
          description: "The interview link has been copied to your clipboard",
        });
      })
      .catch(() => {
        toast({
          title: "Failed to copy",
          description: "Could not copy the link to clipboard",
          variant: "destructive",
        });
      });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Share Interview</CardTitle>
          <CardDescription>
            Generate a shareable link that allows participants to join an interview
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {shareableLink ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="share-link">Interview Link</Label>
                  <div className="flex mt-1.5">
                    <Input
                      id="share-link"
                      value={shareableLink}
                      readOnly
                      className="flex-1 rounded-r-none"
                    />
                    <Button
                      variant="secondary"
                      className="rounded-l-none"
                      onClick={copyToClipboard}
                    >
                      {isLinkCopied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <div className="py-4 px-3 bg-gray-50 rounded-md">
                  <h4 className="text-sm font-medium">Instructions:</h4>
                  <ul className="text-sm text-gray-600 mt-2 space-y-1 list-disc list-inside">
                    <li>Share this link with the interview participant</li>
                    <li>They can join directly without needing to create an account</li>
                    <li>The interview will use your research objectives and knowledge base</li>
                    <li>Generate a new link for each participant for better tracking</li>
                  </ul>
                </div>
                
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => generateLinkMutation.mutate()}
                    disabled={generateLinkMutation.isPending}
                  >
                    {generateLinkMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      "Generate New Link"
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="mb-4">
                  <Share className="h-12 w-12 mx-auto text-gray-400" />
                </div>
                <h3 className="text-lg font-medium">Create a shareable interview link</h3>
                <p className="text-gray-500 mt-2 max-w-md mx-auto">
                  Generate a unique link that you can share with participants to conduct
                  interviews without them needing an account.
                </p>
                
                <Button
                  className="mt-6"
                  onClick={() => generateLinkMutation.mutate()}
                  disabled={generateLinkMutation.isPending}
                >
                  {generateLinkMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate Shareable Link"
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}