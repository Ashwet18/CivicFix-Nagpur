import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  createIssue,
  getIssue,
  listIssues,
} from '../services/issues';

export const STATUS = {
  REPORTED: 'Reported',
  ACKNOWLEDGED: 'Acknowledged',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  REJECTED: 'Rejected',
};

const PAGE_SIZE = 100;

const ComplaintsContext = createContext(null);

export function ComplaintsProvider({ children }) {
  const [complaints, setComplaints] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const listRequestRef = useRef(null);
  const mutationVersionRef = useRef(0);
  const detailRequestsRef = useRef(new Map());

  const refreshComplaints = useCallback(async () => {
    if (listRequestRef.current) return listRequestRef.current;

    const requestVersion = mutationVersionRef.current;
    setError(null);
    setRefreshing(true);
    if (!hasLoadedRef.current) setLoading(true);

    const request = (async () => {
      try {
        const firstPage = await listIssues({ skip: 0, limit: PAGE_SIZE });
        const allIssues = [...firstPage.items];
        let nextSkip = firstPage.skip + firstPage.items.length;

        while (nextSkip < firstPage.total && firstPage.items.length > 0) {
          const page = await listIssues({ skip: nextSkip, limit: PAGE_SIZE });
          if (
            page.skip !== nextSkip ||
            page.items.length === 0 ||
            page.total !== firstPage.total
          ) {
            throw new Error(
              'The community issue list changed while it was loading. Pull to refresh and try again.'
            );
          }
          allIssues.push(...page.items);
          nextSkip = page.skip + page.items.length;
        }

        if (allIssues.length !== firstPage.total) {
          throw new Error('The API returned an incomplete community issue list.');
        }

        if (mountedRef.current && requestVersion === mutationVersionRef.current) {
          setComplaints(allIssues);
          setTotal(firstPage.total);
          setError(null);
          hasLoadedRef.current = true;
        }
      } catch (requestError) {
        if (
          mountedRef.current &&
          requestVersion === mutationVersionRef.current
        ) {
          setError(requestError);
        }
        throw requestError;
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
        listRequestRef.current = null;
        if (
          mountedRef.current &&
          requestVersion !== mutationVersionRef.current
        ) {
          refreshComplaints().catch(() => {
            // The follow-up refresh exposes failures through context state.
          });
        }
      }
    })();

    listRequestRef.current = request;
    return request;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    refreshComplaints().catch(() => {
      // The error is exposed through context for the screens to render.
    });

    return () => {
      mountedRef.current = false;
    };
  }, [refreshComplaints]);

  const addComplaint = useCallback(async (data) => {
    const createdIssue = await createIssue(data);
    mutationVersionRef.current += 1;

    if (mountedRef.current) {
      setComplaints((previous) => [
        createdIssue,
        ...previous.filter((issue) => issue.id !== createdIssue.id),
      ]);
      setTotal((previous) => previous + 1);
      setError(null);
    }

    return createdIssue;
  }, []);

  const getById = useCallback((id) => {
    const requestKey = String(id);
    const existingRequest = detailRequestsRef.current.get(requestKey);
    if (existingRequest) return existingRequest;

    const request = getIssue(id).finally(() => {
      detailRequestsRef.current.delete(requestKey);
    });
    detailRequestsRef.current.set(requestKey, request);
    return request;
  }, []);

  return (
    <ComplaintsContext.Provider
      value={{
        complaints,
        total,
        loading,
        refreshing,
        error,
        refreshComplaints,
        addComplaint,
        getById,
      }}
    >
      {children}
    </ComplaintsContext.Provider>
  );
}

export function useComplaints() {
  const ctx = useContext(ComplaintsContext);
  if (!ctx) throw new Error('useComplaints must be used inside <ComplaintsProvider>');
  return ctx;
}
