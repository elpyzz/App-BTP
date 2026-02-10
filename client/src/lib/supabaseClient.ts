// Mock Supabase client - Supabase désactivé
export const supabase = {
  auth: {
    getSession: async () => {
      const sessionStr = localStorage.getItem('mock_session');
      return { data: { session: sessionStr ? JSON.parse(sessionStr) : null }, error: null };
    },
    getUser: async () => {
      const userStr = localStorage.getItem('mock_user');
      return { data: { user: userStr ? JSON.parse(userStr) : null }, error: null };
    },
    signUp: async (credentials: any) => {
      const user = {
        id: crypto.randomUUID(),
        email: credentials.email,
        user_metadata: credentials.options?.data || {},
        created_at: new Date().toISOString()
      };
      localStorage.setItem('mock_user', JSON.stringify(user));
      localStorage.setItem('mock_session', JSON.stringify({ user, access_token: 'mock_token' }));
      return { data: { user, session: { user } }, error: null };
    },
    signInWithPassword: async (credentials: any) => {
      // Accepter n'importe quel email/mot de passe - créer ou récupérer l'utilisateur
      let userStr = localStorage.getItem('mock_user');
      let user;
      
      if (userStr) {
        user = JSON.parse(userStr);
        // Mettre à jour l'email si différent
        if (user.email !== credentials.email) {
          user.email = credentials.email;
          localStorage.setItem('mock_user', JSON.stringify(user));
        }
      } else {
        // Créer un nouvel utilisateur si aucun n'existe
        user = {
          id: crypto.randomUUID(),
          email: credentials.email,
          user_metadata: {},
          created_at: new Date().toISOString()
        };
        localStorage.setItem('mock_user', JSON.stringify(user));
      }
      
      const session = { user, access_token: 'mock_token' };
      localStorage.setItem('mock_session', JSON.stringify(session));
      return { data: { user, session }, error: null };
    },
    signOut: async () => {
      localStorage.removeItem('mock_user');
      localStorage.removeItem('mock_session');
      return { error: null };
    },
    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      // Mock subscription
      return {
        data: {
          subscription: {
            unsubscribe: () => {}
          }
        }
      };
    }
  },
  from: (table: string) => ({
    select: (columns?: string) => {
      const queryBuilder = {
        eq: (column: string, value: any) => {
          const eqBuilder = {
            single: async () => {
              const data = getMockData(table);
              const item = Array.isArray(data) ? data.find((item: any) => item[column] === value) : null;
              return { data: item || null, error: item ? null : { message: 'Not found' } };
            },
            order: (column: string, options?: any) => ({
              limit: (count: number) => ({
                single: async () => {
                  const data = getMockData(table);
                  const filtered = Array.isArray(data) ? data.filter((item: any) => item[column] === value) : [];
                  const sorted = filtered.sort((a: any, b: any) => {
                    const aVal = a[column];
                    const bVal = b[column];
                    if (options?.ascending === false) {
                      return bVal > aVal ? 1 : -1;
                    }
                    return aVal > bVal ? 1 : -1;
                  });
                  return { data: sorted.slice(0, count), error: null };
                }
              })
            })
          };
          // Support pour plusieurs eq() en chaîne
          eqBuilder.eq = (column2: string, value2: any) => ({
            single: async () => {
              const data = getMockData(table);
              const item = Array.isArray(data) ? data.find((item: any) => 
                item[column] === value && item[column2] === value2
              ) : null;
              return { data: item || null, error: item ? null : { message: 'Not found' } };
            }
          });
          return eqBuilder;
        }
      };
      // Si select() est appelé sans eq(), retourner tous les éléments
      (queryBuilder as any).then = async () => {
        const data = getMockData(table);
        return { data: Array.isArray(data) ? data : [], error: null };
      };
      return queryBuilder;
    },
    insert: (values: any) => ({
      select: (columns?: string) => ({
        single: async () => {
          const newItem = { ...values, id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
          addMockData(table, newItem);
          return { data: newItem, error: null };
        }
      })
    }),
    update: (values: any) => ({
      eq: (column: string, value: any) => {
        const updateBuilder = {
          select: (columns?: string) => ({
            single: async () => {
              const data = getMockData(table);
              const item = Array.isArray(data) ? data.find((item: any) => item[column] === value) : null;
              if (item) {
                Object.assign(item, values, { updated_at: new Date().toISOString() });
                saveMockData(table, data);
                return { data: item, error: null };
              }
              return { data: null, error: { message: 'Not found' } };
            }
          }),
          eq: (column2: string, value2: any) => {
            // Support pour plusieurs eq() en chaîne dans update
            return {
              select: (columns?: string) => ({
                single: async () => {
                  const data = getMockData(table);
                  const item = Array.isArray(data) ? data.find((item: any) => 
                    item[column] === value && item[column2] === value2
                  ) : null;
                  if (item) {
                    Object.assign(item, values, { updated_at: new Date().toISOString() });
                    saveMockData(table, data);
                    return { data: item, error: null };
                  }
                  return { data: null, error: { message: 'Not found' } };
                }
              })
            };
          }
        };
        return updateBuilder;
      }
    }),
    delete: () => ({
      eq: (column: string, value: any) => {
        const deleteBuilder = {
          eq: (column2: string, value2: any) => {
            const data = getMockData(table);
            if (Array.isArray(data)) {
              const filtered = data.filter((item: any) => !(item[column] === value && item[column2] === value2));
              saveMockData(table, filtered);
            }
            return Promise.resolve({ error: null });
          }
        };
        // Support pour un seul eq() dans delete
        (deleteBuilder as any).then = async () => {
          const data = getMockData(table);
          if (Array.isArray(data)) {
            const filtered = data.filter((item: any) => item[column] !== value);
            saveMockData(table, filtered);
          }
          return { error: null };
        };
        return deleteBuilder;
      }
    })
  })
};

// Helper functions pour gérer les données mock dans localStorage
function getMockData(table: string): any[] {
  const key = `mock_${table}`;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function saveMockData(table: string, data: any[]): void {
  const key = `mock_${table}`;
  localStorage.setItem(key, JSON.stringify(data));
}

function addMockData(table: string, item: any): void {
  const data = getMockData(table);
  data.push(item);
  saveMockData(table, data);
}

