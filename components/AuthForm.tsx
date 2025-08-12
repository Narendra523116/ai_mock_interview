"use client"

import { z } from "zod"
import { zodResolver} from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import {Form} from "@/components/ui/form"
import  FormField  from "@/components/FormField"
import Image from "next/image";
import Link from "next/link";
import {toast} from "sonner";
import {useRouter} from "next/navigation";
import {createUserWithEmailAndPassword, signInWithEmailAndPassword} from "firebase/auth";
import {auth} from "@/firebase/client";
import { signUp, signIn } from "@/lib/action/auth.action";

const authFormSchema = (type : FormType)=>{
    return z.object({
        name: type === 'sign-up'?  z.string().min(3).max(30) : z.string().optional(),
        email: z.email(),
        password: z.string().min(6).max(255),
    })
}

const AuthForm = ( { type } : {type : FormType}) => {

    const router = useRouter();
    const formSchema = authFormSchema(type)

    // defining form
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues:{
            name: "",
            email:"",
            password:""
        },
    })

    // defining submit handler
     async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            if (type === "sign-up") {

                const {name, email, password} = values;

                const userCredentials = await createUserWithEmailAndPassword(auth, email, password);
                const result = await signUp({
                    uid: userCredentials.user.uid,
                    name: name!,
                    email: email,
                    password: password,
                })

                if (!result?.success) {
                    toast.error(result.message || "Failed to create account, please try again.");
                    return;
                }

                toast.success("Account created successfully, please sign in. ")
                router.push("/sign-in")
            } else {

                const {email, password} = values;

                const userCredentials = await signInWithEmailAndPassword(auth, email, password);

                const idToken = await userCredentials.user.getIdToken()

                console.log(idToken)

                if(!idToken){
                    toast.error("sign in failed");
                    return;
                }

                const result = await signIn({
                    email, idToken
                })

                if (!result?.success) {
                    toast.error(result.message || "Sign in failed");
                    return;
                }

                toast.success("Signed in successfully")
                router.push("/")
            }
        } catch (error: any) {
            console.error(error);

            // If Firebase auth error, it will have a message property
            if (error?.message) {
                toast.error(error.message);
            } else if (typeof error === "string") {
                toast.error(error);
            } else {
                toast.error("Something went wrong. Please try again.");
            }
        }

     }

    const isSignIn = type === "sign-in"

    return (
        <div className="card-border lg:min-w-[566px]">

            <div className="flex flex-col gap-6 card py-14 px-10">
                <div className="flex flex-row gap-2 justify-center">
                    <Image src="/logo.svg" alt="logo" height = {32} width = {38} />
                        <h2 className="text-primary-100">PrepWise</h2>
                </div>
                <h3>Practice job interview with AI</h3>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-6 mt-4 form">

                        { !isSignIn && (
                            <FormField
                                control = {form.control}
                                name="name"
                                label="Name"
                                placeholder="Enter your name"/>
                        )}

                        <FormField
                            control = {form.control}
                            name="email"
                            label="email"
                            placeholder="Enter your email adress"
                            type="email"
                        />

                        <FormField
                            control = {form.control}
                            name="password"
                            label="password"
                            placeholder="Enter your password"
                            type="password"
                        />

                        <Button className="btn" type="submit">{isSignIn ? 'Sign in' : 'Create An Account'}</Button>
                    </form>
                </Form>

                <p className="text-center">
                    {isSignIn? "No account yet?" : "Have an account already!"}
                    <Link href={isSignIn? '/sign-up' : '/sign-in'} className="font-bold text-user-primary ml-1">
                        {isSignIn ? ' Sign up' : ' Sign in'}
                    </Link>
                </p>


            </div>

        </div>
    )
}
export default AuthForm
