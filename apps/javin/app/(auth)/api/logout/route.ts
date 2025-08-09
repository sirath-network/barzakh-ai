import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  
  // Clear Auth.js cookies
  response.cookies.delete('authjs.session-token');
  response.cookies.delete('authjs.csrf-token');
  response.cookies.delete('authjs.callback-url');
  response.cookies.delete('__Secure-authjs.session-token');
  response.cookies.delete('__Secure-authjs.callback-url');
  response.cookies.delete('__Secure-authjs.csrf-token');
  
  return response;
}