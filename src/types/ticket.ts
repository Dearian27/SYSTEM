export type TicketSpent = {
  ticketName: string;
  spent: number;
  sessions: number;
};

export type TicketSpentMap = Record<
  string,
  {
    spent: number;
    sessions: number;
  }
>;

export type TicketFrontmatter = {
  type?: string;
  area?: string;
  status?: string;
  estimate?: number | null;
  sprint?: string;
  ticket_type?: string;
};

export type TicketFile = {
  ticketName: string;
  fileName: string;
  filePath: string;
  frontmatter: TicketFrontmatter;
};

export type TicketStats = {
  ticketName: string;
  fileName: string;
  filePath: string;
  area: string | null;
  status: string | null;
  sprint: string | null;
  ticketType: string | null;
  estimate: number | null;
  spent: number;
  sessions: number;
  remaining: number | null;
};
