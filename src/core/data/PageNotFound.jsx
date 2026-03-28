import { useLocation } from 'react-router-dom';
import { authApi } from '@/core/data/auth-api';
import { useQuery } from '@tanstack/react-query';


export default function PageNotFound({}) {
    const location = useLocation();
    const pageName = location.pathname.substring(1);

    const { data: authData, isFetched } = useQuery({
        queryKey: ['user'],
        queryFn: async () => {
            const session = await authApi.getSession();
            return { user: session?.user || null, isAuthenticated: Boolean(session?.authenticated), isAdmin: Boolean(session?.is_admin || session?.user?.is_admin) };
        }
    });
    
    return (
        <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg0)' }}>
            <div className="max-w-md w-full">
                <div className="text-center space-y-6">
                    {/* 404 Error Code */}
                    <div className="space-y-2">
                        <h1 className="text-7xl font-light" style={{ color: 'var(--t3)' }}>404</h1>
                        <div className="h-0.5 w-16 mx-auto" style={{ background: 'var(--b1)' }}></div>
                    </div>
                    
                    {/* Main Message */}
                    <div className="space-y-3">
                        <h2 className="text-2xl font-medium" style={{ color: 'var(--t0)' }}>
                            Page Not Found
                        </h2>
                        <p className="leading-relaxed" style={{ color: 'var(--t1)' }}>
                            The page <span className="font-medium" style={{ color: 'var(--t0)' }}>"{pageName}"</span> could not be found in this application.
                        </p>
                    </div>
                    
                    {/* Admin Note */}
                    {isFetched && authData.isAuthenticated && authData.isAdmin && (
                        <div className="mt-8 p-4 rounded-lg" style={{ background: 'var(--bg2)', border: '0.5px solid var(--b1)' }}>
                            <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5" style={{ background: 'var(--warn-bg)', border: '0.5px solid var(--warn-b)' }}>
                                    <div className="w-2 h-2 rounded-full" style={{ background: 'var(--warn)' }}></div>
                                </div>
                                <div className="text-left space-y-1">
                                    <p className="text-sm font-medium" style={{ color: 'var(--t0)' }}>Admin Note</p>
                                    <p className="text-sm leading-relaxed" style={{ color: 'var(--t1)' }}>
                                        This route is not wired into the current app shell yet. Add the page and register the route before linking to it.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Action Button */}
                    <div className="pt-6">
                        <button 
                            onClick={() => window.location.href = '/'} 
                            className="inline-flex items-center px-4 py-2 text-sm font-medium transition-colors duration-200 focus:outline-none"
                            style={{ color: 'var(--t1)', background: 'var(--bg1)', border: '0.5px solid var(--b1)', borderRadius: 8 }}
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            Go Home
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
