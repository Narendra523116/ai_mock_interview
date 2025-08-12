'use server'

import {db, auth} from "@/firebase/admin";
import {cookies} from "next/headers";

const ONE_WEEK = 60 * 60 * 24 * 7

export async function signUp(params: SignUpParams){
    const {uid, name, email } = params;

    try{

        const userRecord = await db.collection('users').doc(uid).get();

        if(userRecord.exists){
            return {
                success: false,
                message: "User already exists, please sign in."
            }
        }

        await db.collection('users').doc(uid).set({
            name, email
        })

        return{
            success: true,
            message: "account created successfully, please sign in"
        }

    } catch(error: any){
        console.error("Error creating a user, ", error);

        if(error.code === 'auth/email-already-exists'){
            return {
                success: false,
                message: 'Email already exists'
            }
        }

        return{
            success: false,
            message: 'Failed to create account'
        }

    }
}

export async function setSessionCookie(idToken: string){
    const cookieStore = await cookies();

    const sessionCookie = await auth.createSessionCookie(idToken, {
        expiresIn: ONE_WEEK * 1000,
    })

    cookieStore.set('session', sessionCookie, {
        maxAge: ONE_WEEK,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        sameSite: 'lax'
    })
}

export async function signIn(params: SignInParams){
    const {email, idToken } = params;

    try{
        await setSessionCookie(idToken);

        return {
            success: true,
            message: 'Signed in successfully'
        };

    }catch(error: any){
        return{
            success: false,
            message: error?.message || 'Failed to set session cookie'
        }
    }
}

export async function getCurrentUser(): Promise<User | null>{
    const cookieStore = await cookies();

    const sessionCookie = cookieStore.get('session')?.value;

    if(!sessionCookie) return null;

    try{
        const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
        const userRecord = await db.collection('users').doc(decodedClaims.uid).get()

        if(!userRecord.exists) return null;

        return{
            ...userRecord.data(),
            id: userRecord.id,
        } as User;
    }catch (error: any){
        console.log(error);
        return null;
    }
}

export async function isAuthenticated(){
    const user = getCurrentUser();
    return !!user;
}
