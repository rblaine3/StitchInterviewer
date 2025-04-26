import { Project } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { useLocation } from "wouter";
import { ChevronRight, MoreVertical, Edit, Trash } from "lucide-react";
import { format } from "date-fns";

interface ProjectCardProps {
  project: Project;
  onEdit: () => void;
  onDelete: () => void;
}

export default function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();

  const handleViewProject = () => {
    setLocation(`/projects/${project.id}`);
  };

  const formattedDate = project.createdAt 
    ? format(new Date(project.createdAt), 'MMM d, yyyy')
    : '';

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 truncate">{project.name}</h3>
          
          <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="mr-2 h-4 w-4" />
                <span>Edit</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={onDelete}
                className="text-red-600 focus:text-red-600"
              >
                <Trash className="mr-2 h-4 w-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <p className="text-sm text-gray-500 mb-4 line-clamp-2">{project.description}</p>
        
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">Created {formattedDate}</span>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-primary hover:text-primary/80 p-0"
            onClick={handleViewProject}
          >
            View
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
