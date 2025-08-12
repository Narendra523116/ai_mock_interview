import {vapi} from "@/lib/vapi.sdk";

async function testWorkflow(workflowId: string) {
    try {
        // Create phone number for workflow testing
        const phoneNumber = await vapi.phoneNumbers.create({
            name: 'Workflow Test Number',
            workflowId: workflowId,
        });

        console.log('Phone number created:', phoneNumber.number);

        // Make an outbound test call
        const testCall = await vapi.calls.create({
            workflowId: workflowId,
            customer: {
                number: '+1234567890', // Replace with your test number
            },
        });

        console.log('Test call initiated:', testCall.id);
        return { phoneNumber, testCall };
    } catch (error) {
        console.error('Error testing workflow:', error);
        throw error;
    }
}

// Test your workflow
testWorkflow('your-workflow-id');
