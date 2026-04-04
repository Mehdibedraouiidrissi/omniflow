'use client';

import { useState } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { Plus, DollarSign, Clock, User } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { formatCurrency } from '@/lib/utils';
import { useApiQuery, useApiMutation } from '@/hooks/use-api';

interface Opportunity {
  id: string;
  name: string;
  value: number;
  contactName: string;
  assigneeName: string;
  daysInStage: number;
  stageId: string;
}

interface Stage {
  id: string;
  name: string;
  position: number;
  opportunities: Opportunity[];
}

interface Pipeline {
  id: string;
  name: string;
  stages: Stage[];
}

const fallbackPipelines: Pipeline[] = [
  {
    id: '1',
    name: 'Sales Pipeline',
    stages: [
      { id: 's1', name: 'New Lead', position: 0, opportunities: [
        { id: 'o1', name: 'Enterprise Deal - Acme', value: 2500000, contactName: 'Sarah Johnson', assigneeName: 'John Doe', daysInStage: 3, stageId: 's1' },
        { id: 'o2', name: 'SMB Package - StartupIO', value: 500000, contactName: 'Mike Chen', assigneeName: 'Jane Smith', daysInStage: 1, stageId: 's1' },
        { id: 'o3', name: 'Consulting - TechCorp', value: 750000, contactName: 'Emma Davis', assigneeName: 'John Doe', daysInStage: 5, stageId: 's1' },
      ]},
      { id: 's2', name: 'Contacted', position: 1, opportunities: [
        { id: 'o4', name: 'Annual Contract - BigCo', value: 1200000, contactName: 'Tom Wilson', assigneeName: 'Jane Smith', daysInStage: 7, stageId: 's2' },
        { id: 'o5', name: 'Platform License', value: 800000, contactName: 'Lisa Park', assigneeName: 'John Doe', daysInStage: 2, stageId: 's2' },
      ]},
      { id: 's3', name: 'Qualified', position: 2, opportunities: [
        { id: 'o6', name: 'Full Suite - MegaCorp', value: 5000000, contactName: 'Alex Kim', assigneeName: 'Jane Smith', daysInStage: 4, stageId: 's3' },
      ]},
      { id: 's4', name: 'Proposal Sent', position: 3, opportunities: [
        { id: 'o7', name: 'Integration Project', value: 1500000, contactName: 'Rachel Green', assigneeName: 'John Doe', daysInStage: 10, stageId: 's4' },
        { id: 'o8', name: 'Migration Package', value: 900000, contactName: 'David Brown', assigneeName: 'Jane Smith', daysInStage: 6, stageId: 's4' },
      ]},
      { id: 's5', name: 'Negotiation', position: 4, opportunities: [
        { id: 'o9', name: 'Enterprise Renewal', value: 3000000, contactName: 'Chris Lee', assigneeName: 'John Doe', daysInStage: 14, stageId: 's5' },
      ]},
      { id: 's6', name: 'Closed Won', position: 5, opportunities: [
        { id: 'o10', name: 'Starter Plan - NewCo', value: 250000, contactName: 'Pat Taylor', assigneeName: 'Jane Smith', daysInStage: 0, stageId: 's6' },
      ]},
    ],
  },
];

export default function PipelinesPage() {
  const [selectedPipelineId, setSelectedPipelineId] = useState('1');

  const { data: pipelines } = useApiQuery<Pipeline[]>(
    ['pipelines'],
    '/pipelines',
    { placeholderData: fallbackPipelines },
  );

  const moveOpp = useApiMutation('patch', '/opportunities/move');

  const allPipelines = pipelines || fallbackPipelines;
  const [localPipeline, setLocalPipeline] = useState<Pipeline | null>(null);
  const pipeline = localPipeline || allPipelines.find((p) => p.id === selectedPipelineId) || allPipelines[0];

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !pipeline) return;

    const sourceStageId = result.source.droppableId;
    const destStageId = result.destination.droppableId;
    const oppId = result.draggableId;

    const newStages = pipeline.stages.map((stage) => ({
      ...stage,
      opportunities: [...stage.opportunities],
    }));

    const sourceStage = newStages.find((s) => s.id === sourceStageId);
    const destStage = newStages.find((s) => s.id === destStageId);
    if (!sourceStage || !destStage) return;

    const [moved] = sourceStage.opportunities.splice(result.source.index, 1);
    if (!moved) return;

    moved.stageId = destStageId;
    moved.daysInStage = 0;
    destStage.opportunities.splice(result.destination.index, 0, moved);

    setLocalPipeline({ ...pipeline, stages: newStages });

    moveOpp.mutate({
      opportunityId: oppId,
      stageId: destStageId,
      position: result.destination.index,
    } as never);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pipelines"
        description="Manage your deals and opportunities"
        actions={
          <div className="flex items-center gap-2">
            <Select value={selectedPipelineId} onValueChange={(v) => { setSelectedPipelineId(v); setLocalPipeline(null); }}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allPipelines.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Opportunity
            </Button>
          </div>
        }
      />

      <ScrollArea className="w-full">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 pb-4" style={{ minWidth: `${(pipeline?.stages.length ?? 1) * 300}px` }}>
            {pipeline?.stages.map((stage) => {
              const stageTotal = stage.opportunities.reduce((sum, o) => sum + o.value, 0);
              return (
                <div key={stage.id} className="w-72 shrink-0">
                  {/* Stage Header */}
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">{stage.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {stage.opportunities.length} deals &middot; {formatCurrency(stageTotal)}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Droppable Column */}
                  <Droppable droppableId={stage.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`min-h-[200px] space-y-2 rounded-lg border-2 border-dashed p-2 transition-colors ${
                          snapshot.isDraggingOver ? 'border-primary/50 bg-primary/5' : 'border-transparent'
                        }`}
                      >
                        {stage.opportunities.map((opp, index) => (
                          <Draggable key={opp.id} draggableId={opp.id} index={index}>
                            {(dragProvided, dragSnapshot) => (
                              <Card
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                                className={`cursor-grab transition-shadow ${
                                  dragSnapshot.isDragging ? 'shadow-lg ring-2 ring-primary/20' : ''
                                }`}
                              >
                                <CardContent className="p-3">
                                  <p className="mb-1 text-sm font-medium">{opp.name}</p>
                                  <div className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
                                    <User className="h-3 w-3" />
                                    {opp.contactName}
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                                      <DollarSign className="h-3 w-3" />
                                      {formatCurrency(opp.value)}
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Clock className="h-3 w-3" />
                                      {opp.daysInStage}d
                                    </div>
                                  </div>
                                  <div className="mt-2 flex items-center gap-1">
                                    <UserAvatar name={opp.assigneeName} className="h-5 w-5 text-[8px]" />
                                    <span className="text-xs text-muted-foreground">{opp.assigneeName}</span>
                                  </div>
                                </CardContent>
                              </Card>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
