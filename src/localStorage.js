// Local Storage Manager for Bestway Jobs
// This replaces Supabase temporarily so the app can work locally

// Sample data
const SAMPLE_CREWS = [
  { id: 'crew-1', name: 'Crew A' },
  { id: 'crew-2', name: 'Crew B' },
  { id: 'crew-3', name: 'Crew C' },
  { id: 'crew-4', name: 'Crew D' },
  { id: 'crew-5', name: 'Crew E' },
  { id: 'crew-6', name: 'Crew F' },
  { id: 'crew-7', name: 'Crew G' },
  { id: 'crew-8', name: 'Crew H' }
];

const SAMPLE_CUSTOMERS = [
  { id: 'customer-1', name: 'Singh Residence', address: '12 Meadow Ln, Brampton' },
  { id: 'customer-2', name: 'Patel Custom Homes', address: '88 Skyline Dr, Mississauga' },
  { id: 'customer-3', name: 'Johnson Family', address: '45 Oak Street, Toronto' },
  { id: 'customer-4', name: 'Smith Construction', address: '123 Main St, Hamilton' },
  { id: 'customer-5', name: 'Brown Residence', address: '67 Pine Ave, Ottawa' },
  { id: 'customer-6', name: 'Wilson Homes', address: '89 Elm Road, London' },
  { id: 'customer-7', name: 'Davis Property', address: '34 Maple Drive, Windsor' },
  { id: 'customer-8', name: 'Taylor Estate', address: '56 Cedar Lane, Kingston' }
];

// Storage keys
const STORAGE_KEYS = {
  CREWS: 'bestway_crews',
  CUSTOMERS: 'bestway_customers',
  JOBS: 'bestway_jobs'
};

// Initialize data if not exists
function initializeData() {
  if (!localStorage.getItem(STORAGE_KEYS.CREWS)) {
    localStorage.setItem(STORAGE_KEYS.CREWS, JSON.stringify(SAMPLE_CREWS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.CUSTOMERS)) {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(SAMPLE_CUSTOMERS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.JOBS)) {
    localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify([]));
  }
}

// Crew operations
export const crews = {
  async select() {
    initializeData();
    const data = localStorage.getItem(STORAGE_KEYS.CREWS);
    return { data: JSON.parse(data) };
  }
};

// Customer operations
export const customers = {
  async select() {
    initializeData();
    const data = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    return { data: JSON.parse(data) };
  },
  
  async insert(customerData) {
    initializeData();
    const customers = JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOMERS));
    const newCustomer = {
      id: `customer-${Date.now()}`,
      ...customerData,
      created_at: new Date().toISOString()
    };
    customers.push(newCustomer);
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    return { data: [newCustomer] };
  }
};

// Job operations
export const jobs = {
  async select() {
    initializeData();
    const data = localStorage.getItem(STORAGE_KEYS.JOBS);
    return { data: JSON.parse(data) };
  },
  
  async insert(jobData) {
    initializeData();
    const jobs = JSON.parse(localStorage.getItem(STORAGE_KEYS.JOBS));
    const newJob = {
      id: `job-${Date.now()}`,
      ...jobData,
      created_at: new Date().toISOString()
    };
    jobs.push(newJob);
    localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(jobs));
    return { data: [newJob] };
  },
  
  async update(id, jobData) {
    initializeData();
    const jobs = JSON.parse(localStorage.getItem(STORAGE_KEYS.JOBS));
    const jobIndex = jobs.findIndex(job => job.id === id);
    if (jobIndex !== -1) {
      jobs[jobIndex] = { ...jobs[jobIndex], ...jobData };
      localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(jobs));
      return { data: [jobs[jobIndex]] };
    }
    return { data: [] };
  },
  
  async delete(id) {
    initializeData();
    const jobs = JSON.parse(localStorage.getItem(STORAGE_KEYS.JOBS));
    const filteredJobs = jobs.filter(job => job.id !== id);
    localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(filteredJobs));
    return { data: [] };
  }
};

// Mock Supabase client
export const localSupabase = {
  from: (table) => {
    switch (table) {
      case 'crews':
        return crews;
      case 'customers':
        return customers;
      case 'jobs':
        return jobs;
      default:
        throw new Error(`Unknown table: ${table}`);
    }
  },
  
  auth: {
    getUser: async () => ({ data: { user: { id: 'local-user' } } }),
    getSession: async () => ({ data: { session: { user: { id: 'local-user' } } } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signOut: async () => ({})
  }
};

// Initialize data on import
initializeData();
