"use server"

import {db} from "@/firebase/admin";
import {generateObject} from "ai";
import {feedbackSchema} from "@/constants";
import {google} from "@ai-sdk/google";

export async function getInterviewsByUserId(userId: string): Promise<Interview[] | null>{
    const interviews = await db.collection('interviews')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get()

    return interviews.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
    })) as Interview[];
}

export async function getLatestInterviews(params: GetLatestInterviewsParams): Promise<Interview[] | null>{

    const { userId , limit = 20 } = params;

    const interviews = await db.collection('interviews')
        .orderBy('createdAt', 'desc')
        .where('userId', '!=', userId)
        .where('finalized', '==', true)
        .limit(limit)
        .get()

    return interviews.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
    })) as Interview[]
}

export async function getInterviewById(id: string): Promise<Interview | null>{
    const interview = await db.collection('interviews')
        .doc(id).get()

    return interview.data() as Interview;
}

function validateTranscriptQuality(transcript: string) {
    const cleanTranscript = transcript?.trim() || '';
    const wordCount = cleanTranscript.split(/\s+/).filter(word => word.length > 0).length;

    // Hard fail conditions
    if (!cleanTranscript || wordCount < 50) {
        return {
            isValid: false,
            suggestedScores: {
                totalScore: 0,
                categoryScores: [
                    { name: "Communication Skills",    score: 0, comment: "No meaningful communication demonstrated" },
                    { name: "Technical Knowledge",      score: 0, comment: "No technical knowledge assessed" },
                    { name: "Problem Solving",          score: 0, comment: "No problem-solving opportunities provided" },
                    { name: "Cultural Fit",             score: 0, comment: "No cultural fit assessment possible" },
                    { name: "Confidence and Clarity",   score: 0, comment: "No confidence or clarity demonstrated" },
                    { name: "Teamwork & Collaboration", score: 0, comment: "No collaboration examples provided" },
                    { name: "Adaptability",             score: 0, comment: "No adaptability assessment possible" },
                    { name: "Time Management",          score: 0, comment: "Interview ended prematurely" },
                    { name: "Leadership Potential",     score: 0, comment: "No leadership potential demonstrated" }
                ],
                strengths: ["No meaningful interview engagement demonstrated"],
                areasForImprovement: ["Complete the interview process"],
                finalAssessment: "Interview terminated prematurely. No assessment possible."
            }
        };
    }

    return { isValid: true };
}


export async function createFeedback(params : CreateFeedbackParams){
    const { interviewId, userId, transcript } = params;

    try{
        const formattedTranscript = transcript.
        map((sentence: { role: string; content: string; }) => (
            `- ${sentence.role}: ${sentence.content}\n`
        )).join('');

        const response = validateTranscriptQuality((formattedTranscript))

        if(!response.isValid){
            return response.suggestedScores;
        }

        const { object: { totalScore, categoryScores, strengths, areasForImprovement, finalAssessment } } = await generateObject({
            model: google('gemini-2.5-pro'),
            schema: feedbackSchema,
            prompt: `
        You are an AI interviewer analyzing a mock interview transcript.
        Your job is to critically evaluate the candidate's performance with BRUTAL HONESTY and STRICT CRITERIA.

        CRITICAL FIRST STEP - TRANSCRIPT VALIDATION:
        Before scoring anything, carefully examine the transcript content:

        1. HARD FAIL CONDITIONS (All scores = 0, totalScore = 0):
           - If transcript is empty, null, or contains only whitespace
           - If transcript has < 50 total words from the candidate
           - If transcript contains only greetings like "Hello", "Hi", "How are you"
           - If candidate speaks for < 30 seconds total
           - If candidate provides no substantial answers to interview questions
           - If candidate disconnects/ends call before first question is completed

        2. MINIMAL ENGAGEMENT (All scores ≤ 20):
           - If candidate provides only 1-2 word answers
           - If transcript shows candidate was unresponsive or evasive
           - If no technical knowledge or problem-solving is demonstrated
           - If candidate shows clear disengagement or lack of preparation

        **SCORING RULES (STRICTLY ENFORCE):**
        - Category scores: 0-100 integers only
        - totalScore: Average of all 9 category scores (0-100)
        - NO MERCY: If performance is poor, score LOW without hesitation
        - ZERO TOLERANCE: Missing or inadequate responses = 0 score for that category

        **REQUIRED RESPONSE FORMAT:**
        You must return a JSON object with exactly this structure:

        {
          "totalScore": <integer 0-100>,
          "categoryScores": [
            {
              "name": "Communication Skills",
              "score": <integer 0-100>,
              "comment": "<detailed explanation of score>"
            },
            {
              "name": "Technical Knowledge", 
              "score": <integer 0-100>,
              "comment": "<detailed explanation of score>"
            },
            {
              "name": "Problem Solving",
              "score": <integer 0-100>,
              "comment": "<detailed explanation of score>"
            },
            {
              "name": "Cultural Fit",
              "score": <integer 0-100>,
              "comment": "<detailed explanation of score>"
            },
            {
              "name": "Confidence and Clarity",
              "score": <integer 0-100>,
              "comment": "<detailed explanation of score>"
            },
            {
              "name": "Teamwork & Collaboration",
              "score": <integer 0-100>,
              "comment": "<detailed explanation of score>"
            },
            {
              "name": "Adaptability",
              "score": <integer 0-100>,
              "comment": "<detailed explanation of score>"
            },
            {
              "name": "Time Management",
              "score": <integer 0-100>,
              "comment": "<detailed explanation of score>"
            },
            {
              "name": "Leadership Potential",
              "score": <integer 0-100>,
              "comment": "<detailed explanation of score>"
            }
          ],
          "strengths": [
            "<specific strength demonstrated in transcript>",
            "<another strength if applicable>"
          ],
          "areasForImprovement": [
            "<specific actionable improvement area>",
            "<another improvement area>",
            "<additional improvement suggestions>"
          ],
          "finalAssessment": "<concise 2-3 sentence summary of overall performance>"
        }

        **CATEGORY REQUIREMENTS:**
        You MUST include exactly these 9 categories in this exact order with exact naming:
        1. "Communication Skills"
        2. "Technical Knowledge" 
        3. "Problem Solving"
        4. "Cultural Fit"
        5. "Confidence and Clarity"
        6. "Teamwork & Collaboration"
        7. "Adaptability"
        8. "Time Management"
        9. "Leadership Potential"

        **HARD FAIL RESPONSE FORMAT:**
        If transcript fails validation criteria above, respond EXACTLY:
        {
          "totalScore": 0,
          "categoryScores": [
            {"name": "Communication Skills", "score": 0, "comment": "No meaningful communication demonstrated"},
            {"name": "Technical Knowledge", "score": 0, "comment": "No technical knowledge assessed"},
            {"name": "Problem Solving", "score": 0, "comment": "No problem-solving opportunities provided"},
            {"name": "Cultural Fit", "score": 0, "comment": "No cultural fit assessment possible"},
            {"name": "Confidence and Clarity", "score": 0, "comment": "No confidence or clarity demonstrated"},
            {"name": "Teamwork & Collaboration", "score": 0, "comment": "No collaboration examples provided"},
            {"name": "Adaptability", "score": 0, "comment": "No adaptability assessment possible"},
            {"name": "Time Management", "score": 0, "comment": "Interview ended prematurely"},
            {"name": "Leadership Potential", "score": 0, "comment": "No leadership potential demonstrated"}
          ],
          "strengths": ["No meaningful interview engagement demonstrated"],
          "areasForImprovement": [
            "Complete the full interview process",
            "Prepare thoroughly before interview", 
            "Engage meaningfully with all questions"
          ],
          "finalAssessment": "Interview terminated prematurely with insufficient engagement. No assessment possible."
        }

        **TRANSCRIPT TO ANALYZE:**
        \${formattedTranscript}

        **EVALUATION CRITERIA:**
        Analyze ONLY what is explicitly demonstrated in the transcript. Do NOT infer or assume capabilities not shown.

        - **Communication Skills**: Clear articulation, structured responses, minimal filler words, professional tone
        - **Technical Knowledge**: Accurate domain knowledge, specific examples, depth of understanding
        - **Problem Solving**: Logical thinking process, systematic approach, creative solutions
        - **Cultural Fit**: Values alignment, team compatibility, company understanding  
        - **Confidence and Clarity**: Assertive responses, clear viewpoints, no excessive hesitation
        - **Teamwork & Collaboration**: Examples of working with others, collaboration mindset
        - **Adaptability**: Handling unexpected questions, adjusting approach, flexibility
        - **Time Management**: Concise relevant answers, avoiding rambling, efficient communication
        - **Leadership Potential**: Initiative examples, decision-making, inspiring others

        **SCORING GUIDELINES:**
        - Empty/minimal transcripts = ALL ZEROS (0)
        - Poor performance = LOW SCORES (0-30 range)
        - Below average = LOWER-MID SCORES (30-50 range)
        - Average performance = MID SCORES (50-70 range)  
        - Good performance = HIGHER SCORES (70-85 range)
        - Exceptional performance = TOP SCORES (85-100 range)

        **CRITICAL REMINDERS:**
        - Must return exactly 9 categoryScores
        - Each score must be 0-100 integer
        - Each category must have a detailed comment
        - strengths array must have at least 1 item
        - areasForImprovement array must have at least 1 item
        - finalAssessment must be a non-empty string
        - totalScore should be the average of all category scores

        Provide your response as a valid JSON object matching the exact format specified above.
    `,
            system: "You are a ruthless interviewer who never gives inflated scores. Empty or minimal transcripts receive zeros across all categories. Only substantial, demonstrated performance receives positive scores. Always return valid JSON in the exact format specified."
        });



        // this is if the user takes the same interview again, we need to show the latest feedback
        const existingFeedbackSnapshot = await db.collection('feedback')
            .where('userId', '==', userId)
            .where('interviewId', '==', interviewId)
            .get();

        if (!existingFeedbackSnapshot.empty) {
            const batch = db.batch();
            existingFeedbackSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        }

        const feedback = await db.collection('feedback').add({
            interviewId,
            userId,
            totalScore,
            categoryScores,
            strengths,
            areasForImprovement,
            finalAssessment,
            createdAt: new Date()
        })

        console.log(feedback);

        return {
            success: true,
            feedbackId: feedback.id,
            error: ''
        }

    }catch(e){
        console.log('Error saving feedback', e);
        return {
            success: false,
            error: e
        }
    }
}

export async function getFeedbackByInterviewId(params: GetFeedbackByInterviewIdParams): Promise<Feedback | null>{

    const { interviewId, userId } = params;

    const feedback = await db.collection('feedback')
        .where('userId', '==', userId)
        .where('interviewId', '==', interviewId)
        .limit(1)
        .get()

    if(feedback.empty) return null;

    const feedbackDoc = feedback.docs[0];

    return{
        id: feedbackDoc.id,
        ...feedbackDoc.data()
    } as Feedback;
}
