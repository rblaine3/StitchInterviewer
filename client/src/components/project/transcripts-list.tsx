import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { InterviewTranscript } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { FileText, Video, User, Calendar, Clock, BarChart, Download } from "lucide-react";

interface TranscriptsListProps {
  projectId: number;
}

export default function TranscriptsList({ projectId }: TranscriptsListProps) {
  const { toast } = useToast();
  const [selectedTranscriptId, setSelectedTranscriptId] = useState<number | null>(null);
  
  // Fetch all transcripts for this project
  const { data: transcripts, isLoading, error } = useQuery<InterviewTranscript[]>({
    queryKey: ["/api/projects", projectId, "transcripts"],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/transcripts`);
      if (!response.ok) {
        throw new Error("Failed to fetch interview transcripts");
      }
      return response.json();
    },
    enabled: !!projectId,
  });
  
  // Fetch single transcript details when selected
  const { data: selectedTranscript } = useQuery<InterviewTranscript>({
    queryKey: ["/api/transcripts", selectedTranscriptId],
    queryFn: async () => {
      const response = await fetch(`/api/transcripts/${selectedTranscriptId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch transcript details");
      }
      return response.json();
    },
    enabled: !!selectedTranscriptId,
  });
  
  const formatDuration = (seconds?: number | null): string => {
    if (!seconds) return "Unknown";
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  const getSentimentLabel = (score?: number | null): { label: string; color: string } => {
    if (score === null || score === undefined) return { label: "Unknown", color: "bg-gray-200 text-gray-800" };
    
    if (score >= 4) return { label: "Very Positive", color: "bg-green-500 text-white" };
    if (score >= 3) return { label: "Positive", color: "bg-green-400 text-white" };
    if (score >= 2) return { label: "Neutral", color: "bg-blue-400 text-white" };
    if (score >= 1) return { label: "Negative", color: "bg-red-400 text-white" };
    return { label: "Very Negative", color: "bg-red-500 text-white" };
  };
  
  const downloadTranscript = (transcript: InterviewTranscript) => {
    try {
      // Create text content
      let content = `# Interview Transcript\n\n`;
      content += `Date: ${format(new Date(transcript.conductedAt), 'PPP')}\n`;
      content += `Participant: ${transcript.participantName || 'Anonymous'}\n`;
      content += `Duration: ${formatDuration(transcript.duration)}\n\n`;
      
      if (transcript.summary) {
        content += `## Summary\n${transcript.summary}\n\n`;
      }
      
      if (transcript.keyFindings) {
        content += `## Key Findings\n${transcript.keyFindings}\n\n`;
      }
      
      content += `## Transcript\n\n`;
      
      // Add the conversation
      const messages = transcript.transcriptData as any[];
      messages.forEach((msg) => {
        const role = msg.type === 'assistant' ? 'Interviewer' : 'Participant';
        content += `${role}: ${msg.text}\n\n`;
      });
      
      // Create and download the file
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `interview-${format(new Date(transcript.conductedAt), 'yyyy-MM-dd')}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Transcript downloaded",
        description: "The interview transcript has been downloaded as a markdown file.",
      });
    } catch (error) {
      console.error("Error downloading transcript:", error);
      toast({
        title: "Download failed",
        description: "Failed to download the transcript.",
        variant: "destructive",
      });
    }
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Interview Transcripts</CardTitle>
          <CardDescription>Loading interview records...</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Interview Transcripts</CardTitle>
          <CardDescription>Error loading transcripts.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">Failed to load interview transcripts. Please try again later.</p>
        </CardContent>
      </Card>
    );
  }
  
  if (!transcripts || transcripts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Interview Transcripts</CardTitle>
          <CardDescription>No interviews have been conducted yet.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Run a test interview or share an interview link with participants to start collecting data.</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Interview Transcripts</CardTitle>
        <CardDescription>Review and analyze your interview recordings</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List of transcripts */}
          <div className="col-span-1 border rounded-md overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b">
              <h3 className="font-medium">Interview Records</h3>
              <p className="text-sm text-gray-500">{transcripts.length} interviews</p>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {transcripts.map((transcript) => (
                <div 
                  key={transcript.id}
                  className={`p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors ${
                    selectedTranscriptId === transcript.id ? "bg-gray-100" : ""
                  }`}
                  onClick={() => setSelectedTranscriptId(transcript.id)}
                >
                  <div className="flex items-center gap-3 mb-1">
                    <FileText className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">
                      {transcript.participantName || "Anonymous participant"}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 flex items-center gap-2 mb-1">
                    <Calendar className="h-3 w-3" />
                    <span>{format(new Date(transcript.conductedAt), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-500 flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      <span>{formatDuration(transcript.duration)}</span>
                    </div>
                    {transcript.sentimentScore !== null && (
                      <Badge 
                        variant="outline" 
                        className={getSentimentLabel(transcript.sentimentScore).color}
                      >
                        {getSentimentLabel(transcript.sentimentScore).label}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Transcript details */}
          <div className="col-span-1 lg:col-span-2">
            {selectedTranscript ? (
              <Tabs defaultValue="transcript">
                <TabsList className="mb-4">
                  <TabsTrigger value="transcript">Transcript</TabsTrigger>
                  <TabsTrigger value="summary">Analysis</TabsTrigger>
                </TabsList>
                
                <TabsContent value="transcript" className="mt-0">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-lg">
                      Conversation with {selectedTranscript.participantName || "Anonymous"}
                    </h3>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => downloadTranscript(selectedTranscript)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                  
                  <div className="space-y-4 max-h-96 overflow-y-auto p-4 border rounded-md">
                    {/* Display the transcript messages */}
                    {(selectedTranscript.transcriptData as any[]).map((message, index) => (
                      <div 
                        key={index} 
                        className={`flex gap-3 ${
                          message.type === 'assistant' ? '' : 'flex-row-reverse'
                        }`}
                      >
                        <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center 
                          ${message.type === 'assistant' ? 'bg-blue-100' : 'bg-green-100'}`}
                        >
                          {message.type === 'assistant' ? (
                            <Video className="h-4 w-4 text-blue-500" />
                          ) : (
                            <User className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                        <div className={`max-w-[75%] px-4 py-2 rounded-lg 
                          ${message.type === 'assistant' 
                            ? 'bg-blue-50 text-blue-900' 
                            : 'bg-green-50 text-green-900'
                          }`}
                        >
                          <p>{message.text}</p>
                          <span className="text-xs opacity-70 mt-1 block">
                            {format(new Date(message.timestamp), 'h:mm a')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="summary" className="mt-0">
                  <div className="space-y-6">
                    {/* Summary section */}
                    <div>
                      <h3 className="font-semibold text-lg mb-2 flex items-center">
                        <BarChart className="h-5 w-5 mr-2 text-blue-500" /> 
                        Summary
                      </h3>
                      {selectedTranscript.summary ? (
                        <div className="p-4 bg-gray-50 rounded-md">
                          <p className="whitespace-pre-line">{selectedTranscript.summary}</p>
                        </div>
                      ) : (
                        <p className="text-gray-500 italic">No summary available</p>
                      )}
                    </div>
                    
                    {/* Key findings section */}
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Key Findings</h3>
                      {selectedTranscript.keyFindings ? (
                        <div className="p-4 bg-gray-50 rounded-md">
                          <p className="whitespace-pre-line">{selectedTranscript.keyFindings}</p>
                        </div>
                      ) : (
                        <p className="text-gray-500 italic">No key findings available</p>
                      )}
                    </div>
                    
                    {/* Metadata section */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 rounded-md">
                        <h4 className="text-sm font-medium text-gray-500 mb-1">Sentiment</h4>
                        <div className="flex items-center">
                          <Badge 
                            variant="outline" 
                            className={getSentimentLabel(selectedTranscript.sentimentScore).color}
                          >
                            {getSentimentLabel(selectedTranscript.sentimentScore).label}
                          </Badge>
                        </div>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-md">
                        <h4 className="text-sm font-medium text-gray-500 mb-1">Duration</h4>
                        <p className="font-medium">{formatDuration(selectedTranscript.duration)}</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <FileText className="h-12 w-12 text-gray-300 mb-4" />
                <h3 className="font-medium text-lg">Select an interview</h3>
                <p className="text-gray-500 max-w-sm mt-1">
                  Click on any interview record to view the transcript and analysis.
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}