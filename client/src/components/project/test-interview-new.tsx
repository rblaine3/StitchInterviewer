import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Mic, UserRound, Volume, Volume2, MessageSquare, Save, CheckCircle2 } from "lucide-react";
import { Project } from "@shared/schema";
import Vapi from "@vapi-ai/web";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Debug line to check for API key in environment variables
console.log("Frontend environment variables:", Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')));

interface TestInterviewProps {
  project: Project; // Pass the entire project object
}

export default function TestInterviewNew({ project }: TestInterviewProps) {
  const projectId = project.id;
  
  const { toast } = useToast();
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [vapiInstance, setVapiInstance] = useState<Vapi | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0);
  const [isCreatingCall, setIsCreatingCall] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [currentAssistantId, setCurrentAssistantId] = useState<string | null>(null);
  const [isSavingTranscript, setIsSavingTranscript] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [participantName, setParticipantName] = useState("");
  const [transcriptSaved, setTranscriptSaved] = useState(false);
  
  // Fetch the API key from the server
  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const response = await fetch('/api/config/vapi-key');
        if (response.ok) {
          const data = await response.json();
          setApiKey(data.apiKey);
          console.log("Successfully retrieved Vapi API key from server");
        } else {
          console.error("Failed to retrieve Vapi API key from server");
        }
      } catch (error) {
        console.error("Error fetching Vapi API key:", error);
      }
    };
    
    fetchApiKey();
  }, []);
  
  // For storing transcript
  type MessageType = 'assistant' | 'user';
  interface TranscriptMessage {
    id: string;
    type: MessageType;
    text: string;
    timestamp: Date;
  }
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);

  // Create the interview
  const createInterviewMutation = useMutation({
    mutationFn: async () => {
      setIsCreatingCall(true);
      const response = await apiRequest(
        "POST",
        `/api/projects/${projectId}/create-interview`
      );
      return response.json();
    },
    onSuccess: (data) => {
      // Start the interview with Vapi using the assistant ID
      console.log("Server returned assistantId:", data.assistantId);
      startInterview(data.assistantId);
    },
    onError: (error: Error) => {
      setIsCreatingCall(false);
      toast({
        title: "Failed to create interview",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Initialize the Vapi client when the interview is started
  // Save transcript mutation
  const saveTranscriptMutation = useMutation({
    mutationFn: async () => {
      setIsSavingTranscript(true);
      
      // Calculate duration in seconds from first to last transcript message
      let durationSeconds = 0;
      if (transcript.length > 1) {
        const firstMsg = transcript[0];
        const lastMsg = transcript[transcript.length - 1];
        durationSeconds = Math.round(
          (lastMsg.timestamp.getTime() - firstMsg.timestamp.getTime()) / 1000
        );
      }
      
      // Create transcript data
      const transcriptData = {
        projectId,
        assistantId: currentAssistantId!,
        participantName: participantName || null,
        transcriptData: transcript,
        duration: durationSeconds
      };
      
      const response = await apiRequest("POST", "/api/transcripts", transcriptData);
      return response.json();
    },
    onSuccess: () => {
      setIsSavingTranscript(false);
      setShowSaveDialog(false);
      setTranscriptSaved(true);
      
      // Update transcripts list if we're viewing it
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "transcripts"] });
      
      toast({
        title: "Transcript saved",
        description: "The interview transcript has been saved successfully.",
      });
    },
    onError: (error: Error) => {
      setIsSavingTranscript(false);
      toast({
        title: "Failed to save transcript",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const startInterview = async (assistantId: string) => {
    try {
      console.log("Starting interview with assistant ID:", assistantId);
      
      // Save the assistantId for later use when saving transcript
      setCurrentAssistantId(assistantId);
      
      // If we don't have an API key yet, wait for it
      if (!apiKey) {
        console.log("Waiting for API key to be fetched from server...");
        toast({
          title: "Loading API configuration",
          description: "Please wait while we prepare the interview session...",
        });
        // We'll set this flag to false so the user can try again
        setIsCreatingCall(false);
        return;
      }
      
      // Check if we're using a mock assistant ID (for testing without Vapi API)
      if (assistantId.startsWith('mock-assistant-')) {
        console.log("Using mock interface for testing");
        // Mock interview script for simulating a conversation
        const mockScript = [
          { speaker: 'assistant', text: "Hello, I'm your AI interviewer today. I'll be asking some questions based on our research objectives." },
          { speaker: 'assistant', text: "Could you tell me a bit about yourself and your experience with this topic?" },
          { speaker: 'user', text: "[User speaks]" },
          { speaker: 'assistant', text: "That's interesting. What specific challenges have you faced in this area?" },
          { speaker: 'user', text: "[User describes challenges]" },
          { speaker: 'assistant', text: "How did you overcome those challenges? Were there any specific strategies that worked well?" },
          { speaker: 'user', text: "[User explains strategies]" },
          { speaker: 'assistant', text: "Based on your experience, what improvements would you suggest for others facing similar situations?" },
          { speaker: 'user', text: "[User provides suggestions]" },
          { speaker: 'assistant', text: "Thank you for sharing your insights. Is there anything else you'd like to add that we haven't covered?" }
        ];
        
        // Generate a unique ID for messages
        const generateId = () => Math.random().toString(36).substring(2, 9);
        
        // Create a mock interface for testing
        const mockVapi = {
          // Mock methods for Vapi
          stop: () => {
            console.log("Mock Vapi stop called");
            // Clear all intervals on stop
            if (mockVapi.mockVolumeInterval) {
              clearInterval(mockVapi.mockVolumeInterval);
            }
            if (mockVapi.mockTranscriptInterval) {
              clearInterval(mockVapi.mockTranscriptInterval);
            }
          },
          setMuted: (muted: boolean) => console.log("Mock Vapi setMuted:", muted),
          start: async () => {
            console.log("Mock Vapi start called");
            
            // Add initial message to transcript
            const initialMessage = mockScript[0];
            setTranscript([{
              id: generateId(),
              type: initialMessage.speaker as MessageType,
              text: initialMessage.text,
              timestamp: new Date()
            }]);
            
            // Set up mock transcript generation
            let messageIndex = 1;
            const transcriptInterval = setInterval(() => {
              if (messageIndex < mockScript.length) {
                const nextMessage = mockScript[messageIndex];
                setTranscript(prev => [...prev, {
                  id: generateId(),
                  type: nextMessage.speaker as MessageType,
                  text: nextMessage.text,
                  timestamp: new Date()
                }]);
                messageIndex++;
              } else {
                clearInterval(transcriptInterval);
              }
            }, 8000); // Add a new message every 8 seconds
            
            // Store the interval ID for cleanup
            // @ts-ignore
            mockVapi.mockTranscriptInterval = transcriptInterval;
          },
          on: (event: string, callback: Function) => {
            console.log(`Mock Vapi registered listener for ${event}`);
            // Simulate volume changes
            if (event === 'volume-level' && callback) {
              // Start a volume simulation interval
              const interval = setInterval(() => {
                const randomVolume = Math.random() * 0.5;
                callback(randomVolume);
              }, 1000);
              
              // Store the interval ID for cleanup
              // @ts-ignore - adding custom property to mock object
              mockVapi.mockVolumeInterval = interval;
              return interval;
            }
            
            // Store call-end event listeners
            if (event === 'call-end') {
              if (!mockVapi.callEndCallbacks) {
                // @ts-ignore - adding custom property
                mockVapi.callEndCallbacks = [];
              }
              // @ts-ignore - using custom property
              mockVapi.callEndCallbacks.push(callback);
            }
            
            // Store call-start event listeners
            if (event === 'call-start') {
              if (!mockVapi.callStartCallbacks) {
                // @ts-ignore - adding custom property
                mockVapi.callStartCallbacks = [];
              }
              // @ts-ignore - using custom property
              mockVapi.callStartCallbacks.push(callback);
              
              // Immediately call the callback
              setTimeout(() => callback(), 500);
            }
            
            // Add other event listeners here as needed
            return null;
          },
          // Properties to store intervals and callbacks for cleanup
          mockVolumeInterval: null as number | null,
          mockTranscriptInterval: null as number | null,
          callEndCallbacks: [] as Function[],
          callStartCallbacks: [] as Function[]
        };
        
        // Simulate volume levels
        mockVapi.on('volume-level', (level: number) => {
          setVolume(level);
        });
        
        // Simulate call initiation
        await mockVapi.start();
        console.log("Mock Vapi call started successfully");
        
        // Save the mock instance to state
        // @ts-ignore - we're using a mock object that mimics Vapi functionality
        setVapiInstance(mockVapi);
        setIsInterviewActive(true);
        setIsCreatingCall(false);
        
        return;
      }
      
      // Real Vapi implementation - per Vapi Web SDK docs
      // Use the API key fetched from the server
      if (!apiKey) {
        console.error("Missing Vapi API key from server!");
        toast({
          title: "Missing API Key",
          description: "The Vapi API key could not be retrieved from the server. Please try again later.",
          variant: "destructive",
        });
        setIsCreatingCall(false);
        return;
      }
      console.log("Using server-provided Vapi API key");
      
      console.log("Creating Vapi instance with API key");
      
      // Create a new Vapi instance with the API key from the server
      console.log("Creating Vapi instance with server-provided API key");
      const vapi = new Vapi(apiKey);

      // Set up event listeners for volume levels
      vapi.on("volume-level", (level: number) => {
        setVolume(level);
      });

      // Set up event listeners for call start
      vapi.on("call-start", () => {
        console.log("Interview call started");
        setIsInterviewActive(true);
        setIsCreatingCall(false);
      });

      // Set up event listeners for call ending
      vapi.on("call-end", () => {
        console.log("Interview call ended");
        setIsInterviewActive(false);
        
        // Auto-save transcript when call ends unexpectedly
        if (transcript.length > 0 && !transcriptSaved && !isSavingTranscript) {
          console.log("Auto-saving transcript on call-end");
          saveTranscriptMutation.mutate();
        }
      });

      // Set up event listeners for speech start/end
      vapi.on("speech-start", () => {
        console.log("Assistant started speaking");
      });

      vapi.on("speech-end", () => {
        console.log("Assistant stopped speaking");
      });

      // Set up event listeners for messages (including transcripts)
      vapi.on("message", (message: any) => {
        console.log("Message received:", message);
        
        // Process different message types
        if (message.type === "transcript") {
          // Handle transcript updates
          setTranscript(prev => [...prev, {
            id: `transcript-${Date.now()}`,
            type: message.transcript.speaker === 'assistant' ? 'assistant' : 'user',
            text: message.transcript.text || "",
            timestamp: new Date()
          }]);
        }
      });
      
      // Set up event listeners for errors
      vapi.on("error", (error: Error) => {
        console.error("Vapi error:", error);
        toast({
          title: "Interview error",
          description: "There was an error during the interview. Please try again.",
          variant: "destructive",
        });
      });

      console.log("Starting Vapi call with assistantId:", assistantId);
      
      // Start the call using the assistantId from our backend
      // This follows the Vapi Web SDK documentation pattern
      const call = await vapi.start(assistantId);
      console.log("Vapi call started successfully:", call);

      // Save the instance to state
      setVapiInstance(vapi);
    } catch (error) {
      console.error("Failed to start interview:", error);
      setIsCreatingCall(false);
      toast({
        title: "Failed to start interview",
        description: "There was an error starting the interview. Please try again.",
        variant: "destructive",
      });
    }
  };

  // End the interview and automatically save the transcript
  const endInterview = () => {
    if (vapiInstance) {
      vapiInstance.stop();
      setVapiInstance(null);
      setIsInterviewActive(false);
      
      // Automatically save the transcript if we have messages and it hasn't been saved already
      if (transcript.length > 0 && !transcriptSaved) {
        // Auto-save the transcript without showing the dialog
        saveTranscriptMutation.mutate();
      }
    }
  };

  // Toggle mute
  const toggleMute = () => {
    if (vapiInstance) {
      vapiInstance.setMuted(!isMuted);
      setIsMuted(!isMuted);
    }
  };

  // Clean up on unmount
  useEffect(() => {
    // Store interval IDs for cleanup
    let volumeInterval: number | null = null;
    let transcriptInterval: number | null = null;
    
    if (vapiInstance) {
      // For mock implementations, access the interval IDs
      // @ts-ignore - handling mock implementation
      if (vapiInstance.mockVolumeInterval) {
        // @ts-ignore - handling mock implementation
        volumeInterval = vapiInstance.mockVolumeInterval;
      }
      
      // @ts-ignore - handling mock implementation
      if (vapiInstance.mockTranscriptInterval) {
        // @ts-ignore - handling mock implementation
        transcriptInterval = vapiInstance.mockTranscriptInterval;
      }
    }
    
    return () => {
      // Clean up Vapi instance
      if (vapiInstance) {
        vapiInstance.stop();
      }
      
      // Clear any intervals (for mock implementation)
      if (volumeInterval) {
        clearInterval(volumeInterval);
      }
      
      if (transcriptInterval) {
        clearInterval(transcriptInterval);
      }
    };
  }, [vapiInstance]);

  // Format timestamp for display
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Test Interview</CardTitle>
          <CardDescription>
            Conduct an AI-powered test interview using your research objective and knowledge base
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isInterviewActive ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left column: Interview controls */}
                <div className="md:col-span-1 space-y-6">
                  <div className="flex items-center justify-center py-6">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center relative">
                      <UserRound className="h-12 w-12 text-gray-600" />
                      <div className="absolute inset-0 rounded-full border-2 border-primary animate-pulse" />

                      {/* Volume indicator */}
                      <div 
                        className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 w-full"
                        style={{ maxWidth: "100px" }}
                      >
                        <div className="h-1 bg-gray-200 rounded-full w-full">
                          <div 
                            className="h-1 bg-primary rounded-full transition-all duration-100"
                            style={{ width: `${volume * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center space-x-4">
                    <Button 
                      variant="outline" 
                      size="icon"
                      className="rounded-full h-12 w-12"
                      onClick={toggleMute}
                    >
                      {isMuted ? <Volume className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={endInterview}
                      className="px-8"
                    >
                      End Interview
                    </Button>
                  </div>
                  {/* Show save status when transcript is saved automatically */}
                  {transcriptSaved && (
                    <div className="flex items-center justify-center mt-2 text-sm text-green-600">
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      <span>Transcript saved automatically</span>
                    </div>
                  )}

                  <div className="text-center text-sm text-gray-500 mt-4">
                    <p>Your AI interviewer is listening to your responses.</p>
                    <p>Speak naturally and the conversation will flow like a real interview.</p>
                  </div>
                </div>

                {/* Right column: Transcript */}
                <div className="md:col-span-2">
                  <div className="bg-gray-50 rounded-lg p-4 h-[400px] flex flex-col">
                    <div className="flex items-center mb-3">
                      <MessageSquare className="mr-2 h-5 w-5 text-gray-500" />
                      <h3 className="text-sm font-medium">Interview Transcript</h3>
                    </div>
                    
                    <ScrollArea className="flex-1 pr-4">
                      <div className="space-y-4">
                        {transcript.length === 0 ? (
                          <div className="text-center text-gray-500 py-4">
                            <p>Transcript will appear here as the interview progresses.</p>
                          </div>
                        ) : (
                          transcript.map((message) => (
                            <div 
                              key={message.id} 
                              className={`flex ${message.type === 'assistant' ? 'justify-start' : 'justify-end'}`}
                            >
                              <div 
                                className={`max-w-[85%] rounded-lg px-4 py-2 ${
                                  message.type === 'assistant' 
                                    ? 'bg-white border border-gray-200' 
                                    : 'bg-primary/10 text-primary-foreground'
                                }`}
                              >
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs font-medium">
                                    {message.type === 'assistant' ? 'AI Interviewer' : 'You'}
                                  </span>
                                  <span className="text-xs text-gray-500 ml-2">
                                    {formatTime(message.timestamp)}
                                  </span>
                                </div>
                                <p className="text-sm">{message.text}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center py-8">
                <div className="mb-4">
                  <Mic className="h-12 w-12 mx-auto text-gray-400" />
                </div>
                <h3 className="text-lg font-medium">Ready to start your test interview?</h3>
                <p className="text-gray-500 mt-2 max-w-md mx-auto">
                  This will create an AI-powered interview session based on your research objectives
                  and knowledge base.
                </p>
              </div>

              <div className="flex justify-center">
                <Button
                  size="lg"
                  onClick={() => createInterviewMutation.mutate()}
                  disabled={isCreatingCall}
                  className="px-8"
                >
                  {isCreatingCall ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Starting Interview...
                    </>
                  ) : (
                    "Start Interview"
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Save Transcript Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Save Interview Transcript</DialogTitle>
            <DialogDescription>
              Save this interview transcript to review later or share with your team.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="participant" className="text-right">
                Participant
              </Label>
              <Input
                id="participant"
                placeholder="Enter participant name (optional)"
                className="col-span-3"
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
              />
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              <p>This transcript contains {transcript.length} messages and will be saved to your project.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => saveTranscriptMutation.mutate()} 
              disabled={isSavingTranscript}
            >
              {isSavingTranscript ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Transcript"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}