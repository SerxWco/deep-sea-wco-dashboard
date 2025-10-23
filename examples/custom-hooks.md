# Creating Custom Hooks

## Basic Pattern

```tsx
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useMyData = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data, error } = await supabase
          .from('my_table')
          .select('*');
        
        if (error) throw error;
        setData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
};
```

## Using React Query

```tsx
import { useQuery } from '@tanstack/react-query';

export const useMyQueryData = () => {
  return useQuery({
    queryKey: ['myData'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('my_table')
        .select('*');
      
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000,    // 30 minutes
  });
};
```

## With Parameters

```tsx
export const useWalletData = (address: string | null) => {
  return useQuery({
    queryKey: ['wallet', address],
    queryFn: async () => {
      if (!address) return null;
      
      const response = await fetch(
        `https://scan.w-chain.com/api/v2/addresses/${address}`
      );
      return response.json();
    },
    enabled: !!address, // Only run when address exists
  });
};
```

## Best Practices

1. **Always return consistent types**
   ```tsx
   { data, loading, error, refetch }
   ```

2. **Use React Query for API data**
   - Automatic caching
   - Background refetching
   - Deduplication

3. **Handle loading and error states**
   ```tsx
   if (loading) return <Spinner />;
   if (error) return <Error message={error} />;
   ```

4. **Add TypeScript types**
   ```tsx
   interface MyData {
     id: string;
     name: string;
   }

   export const useMyData = (): UseMyDataReturn => {
     // ...
   };
   ```
