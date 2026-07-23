export const STATIC_EMPLOYEES = {
  "EMP-001": { 
    name: "Harsha Vardhan", 
    department: "Engineering", 
    role: "Principal Architect", 
    avatar: "https://i.pravatar.cc/150?img=33" 
  },
  "EMP-002": { 
    name: "Priya Sharma", 
    department: "Engineering", 
    role: "Senior Frontend Engineer", 
    avatar: "https://i.pravatar.cc/150?img=49" 
  },
  "EMP-003": { 
    name: "Arun Kumar", 
    department: "Operations", 
    role: "Operations Lead", 
    avatar: "https://i.pravatar.cc/150?img=12" 
  },
  "EMP-004": { 
    name: "Ananya Patel", 
    department: "HR", 
    role: "Talent Acquisition Lead", 
    avatar: "https://i.pravatar.cc/150?img=47" 
  },
  "EMP-005": { 
    name: "Rajesh Nair", 
    department: "Engineering", 
    role: "QA Lead", 
    avatar: "https://i.pravatar.cc/150?img=68" 
  },
  "EMP-006": { 
    name: "Deepika Rao", 
    department: "Operations", 
    role: "Logistics Coordinator", 
    avatar: "https://i.pravatar.cc/150?img=32" 
  },
  "EMP-007": { 
    name: "Karan Johar", 
    department: "HR", 
    role: "HR Generalist", 
    avatar: "https://i.pravatar.cc/150?img=11" 
  },
  "EMP-008": { 
    name: "Vikram Malhotra", 
    department: "Engineering", 
    role: "DevOps Architect", 
    avatar: "https://i.pravatar.cc/150?img=59" 
  }
};

export const INITIAL_LOGS = [
  { log_id: "LOG-100", employee_id: "EMP-002", timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), direction: "OUT" },
  { log_id: "LOG-099", employee_id: "EMP-008", timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), direction: "IN" },
  { log_id: "LOG-098", employee_id: "EMP-007", timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(), direction: "IN" },
  { log_id: "LOG-097", employee_id: "EMP-006", timestamp: new Date(Date.now() - 35 * 60 * 1000).toISOString(), direction: "IN" },
  { log_id: "LOG-096", employee_id: "EMP-001", timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(), direction: "OUT" },
  { log_id: "LOG-095", employee_id: "EMP-005", timestamp: new Date(Date.now() - 55 * 60 * 1000).toISOString(), direction: "IN" },
  { log_id: "LOG-094", employee_id: "EMP-004", timestamp: new Date(Date.now() - 70 * 60 * 1000).toISOString(), direction: "IN" },
  { log_id: "LOG-093", employee_id: "EMP-003", timestamp: new Date(Date.now() - 85 * 60 * 1000).toISOString(), direction: "IN" },
  { log_id: "LOG-092", employee_id: "EMP-002", timestamp: new Date(Date.now() - 100 * 60 * 1000).toISOString(), direction: "IN" },
  { log_id: "LOG-091", employee_id: "EMP-001", timestamp: new Date(Date.now() - 115 * 60 * 1000).toISOString(), direction: "IN" }
];

export const LOGS_PER_PAGE = 20;
export const EMPLOYEES_PER_PAGE = 10;
