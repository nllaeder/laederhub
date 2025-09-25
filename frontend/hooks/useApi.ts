'use client';

import { useSession } from 'next-auth/react';

// This is a placeholder for your FastAPI backend URL.
// In a real application, you would get this from environment variables.
const API_BASE_URL = 'http://your-fastapi-backend.example.com';

/**
 * A stub for a custom hook to make authenticated API requests to the FastAPI backend.
 * The chat panel currently uses a mock and does not call this hook.
 * This file is provided as a starting point for your backend integration.
 */
export const useApi = () => {
  const { data: session } = useSession();

  const makeRequest = async <T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    body?: any
  ): Promise<T> => {
    if (!session?.user) {
      throw new Error('User is not authenticated. Cannot make API requests.');
    }

    const token = session.user.accessToken;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const config: RequestInit = {
      method,
      headers,
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE_URL}/${endpoint}`, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'An API error occurred.');
    }

    return response.json();
  };
  
  const get = <T>(endpoint: string) => makeRequest<T>(endpoint, 'GET');
  const post = <T>(endpoint: string, body: any) => makeRequest<T>(endpoint, 'POST', body);
  const put = <T>(endpoint: string, body: any) => makeRequest<T>(endpoint, 'PUT', body);
  const del = <T>(endpoint: string) => makeRequest<T>(endpoint, 'DELETE');

  return { get, post, put, del };
};
