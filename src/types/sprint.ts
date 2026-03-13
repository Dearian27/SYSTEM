export type SprintConfig = {
  name: string;
  start: string;
  end: string;
  capacity?: number;
};

export type SprintTicketStats = {
  ticketName: string;
  fileName: string | null;
  filePath: string | null;
  area: string | null;
  status: string | null;
  estimate: number | null;

  spent: number;
  sessions: number;

  remaining: number | null;
};

export type SprintSummary = {
  sprintName: string;
  start: string;
  end: string;

  capacity: number | null;

  totalEstimate: number;
  totalSpent: number;
  totalRemaining: number;

  ticketCount: number;

  ticketsByStatus: Record<string, number>;
  effortByArea: Record<string, number>;

  tickets: SprintTicketStats[];
};
