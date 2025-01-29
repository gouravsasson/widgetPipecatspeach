import { useEffect, useState } from "react";
import { RTVIClient } from "@pipecat-ai/client-js";
import { DailyTransport } from "@pipecat-ai/daily-transport";
import { RTVIClientAudio, RTVIClientProvider } from "@pipecat-ai/client-react";
import Videobot from "./Video";
// import { useWidgetContext } from "./constexts/WidgetContext";
import axios from "axios";
import { ArrowRightSquareIcon } from "lucide-react";
import { FunctionCallParams } from "@pipecat-ai/client-js";
import { LLMHelper } from "@pipecat-ai/client-js";

interface UserDetails {
  name: string;
  email: string;
  phone: string;
}

function App() {
  const [client, setClient] = useState<RTVIClient | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [isVoiceAgent, setIsVoiceAgent] = useState(false);
  const [eventTypeId, setEventTypeId] = useState<number>();
  const [agentPhone, setAgentPhone] = useState<string>("");
  const [isAgentDataLoaded, setIsAgentDataLoaded] = useState(false);
  const [apiKey, setApiKey] = useState<string>("");
  // const { agent_id, schema } = useWidgetContext();
  const baseurl = `https://xjs6k34l-8000.inc1.devtunnels.ms`;
  const agent_id = "a0a591d7-7ae9-46e1-9b11-0038f23c204e";
  const schema = "0c133d26-972a-47ea-8050-51a943f2d1d0";

  useEffect(() => {
    const checkAgentType = async () => {
      try {
        const response = await axios.get(
          `${baseurl}/api/get-agent/${agent_id}/?schema_name=${schema}`,
          {
            headers: {
              // Authorization: `Bearer ${token}`,
              // "schema-name": schemaName,
            },
          }
        );
        setIsVoiceAgent(response.data.type === "OpenAIVoice");
        setEventTypeId(response.data.cal_event_id);
        setAgentPhone(response.data.agent_phone_number);
        setApiKey(response.data.cal_api_key);
        setIsAgentDataLoaded(true);
        console.log("voice agent", isVoiceAgent);
        console.log("voice agent", response.data.type === "OpenAIVoice");
      } catch (error) {
        console.error("Error checking agent type:", error);
        setIsVoiceAgent(false);
        setIsAgentDataLoaded(true);
      }
    };

    if (agent_id) {
      checkAgentType();
    }
  }, []);

  async function updateCallSession(sessionId: any, data: any) {
    try {
      const response = await axios.patch(
        `${baseurl}/api/callsession/${sessionId}/`,
        data,
        {
          headers: {
            // Authorization: `Bearer ${token}`,
            // "schema-name": schemaName,
          },
        }
      );
      console.log("Updated Call Session:", response.data);
    } catch (error) {
      console.error("Update Call Session Error:", error);
    }
  }

  useEffect(() => {
    const initializeClient = async () => {
      try {
        const sessionResponse = await axios.post(
          `${baseurl}/api/callsession/create/${agent_id}/`,
          {
            schema_name: schema,
          },
          {
            // headers: {
            //   // Authorization: `Bearer ${token}`,
            // },
          }
        );
        const sessionId = sessionResponse.data.response;
        // setSessionId(sessionId); // Save session ID for future use
        const newClient = new RTVIClient({
          params: {
            baseUrl: `${baseurl}/api/daily-bots/voice-openai`,
            requestData: {
              agent_code: agent_id,
              schema_name: schema,
              call_session_id: sessionId,
            },
            vad_stop_secs: 0.5,
          },

          transport: new DailyTransport(),
          enableCam: true,
          enableMic: true,
        });
        const llmHelper = newClient.registerHelper(
          "llm",
          new LLMHelper({
            callbacks: {},
          })
        ) as LLMHelper;

        llmHelper.handleFunctionCall(async (fn: FunctionCallParams) => {
          const args = fn.arguments as any;
          console.log("FN args", args);
          console.log("FN", fn);

          if (fn.functionName === "collect_user_details") {
            const { name, email, phone } = args;
            console.log("Collected User Details:");
            console.log(`Name: ${name}`);
            console.log(`Email: ${email}`);
            console.log(`Phone: ${phone}`);

            setUserDetails({ name, email, phone });

            if (!sessionId) {
              console.error("Session ID not found.");
              return { success: false, message: "Session ID not found" };
            }

            // Properly extract first and last name
            const nameParts = name.trim().split(" ");
            const firstName = nameParts[0] || "";
            const lastName =
              nameParts.length > 1 ? nameParts.slice(1).join(" ") : "N/A";

            try {
              await updateCallSession(sessionId, {
                first_name: firstName,
                last_name: lastName,
                email,
                phone_number: phone,
                agent: agent_id,
                schema_name: schema,
              });

              console.log("Call session updated successfully.");
              return { success: true };
            } catch (error) {
              console.error("Error updating call session:", error);
              return {
                success: false,
                message: "Failed to update call session",
              };
            }
          } else if (fn.functionName === "notify_agency") {
            const { name, email, phone } = args;

            if (!name) {
              console.log("USER DETAILS NOT FOUND");
              return { error: "User details not collected yet" };
            }

            // Prepare the SMS message with appointment details
            const message = `
              New Lead:
              Name: ${name}
              Email: ${email}
              Phone: ${phone}
    
              You have a new lead
            `;

            // Send SMS with appointment details
            const smsResponse = await fetch(
              `${baseurl}/api/daily-bots/send-sms`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  to: agentPhone, // Not required
                  from: "+17755879759", // Not required
                  message: message,
                }),
              }
            );

            const smsJson = await smsResponse.json();
            console.log("SMS Response:", smsJson);
            return { success: true, smsResponse: smsJson };
          } else if (fn.functionName === "get_first_available_slot") {
            const { appointment_date } = args; // Extract start_date from args
            let start_time, end_time, start_date;
            start_date = appointment_date;
            // Set the start time as the current time and the end time as one day from today
            if (start_date) {
              const startDateObj = new Date(start_date); // Parse start_date from args
              start_time = startDateObj.toISOString(); // Convert to ISO 8601 format
              const endDateObj = new Date(startDateObj);
              endDateObj.setDate(endDateObj.getDate() + 1); // Set end time to one day after start date
              end_time = endDateObj.toISOString(); // Convert end time to ISO format
            } else {
              // Default to the current time and one day ahead
              start_time = new Date().toISOString();
              const end_time_date = new Date();
              end_time_date.setDate(end_time_date.getDate() + 1);
              end_time = end_time_date.toISOString();
            }

            console.log("Fetching first available slot...");
            await llmHelper.appendToMessages(
              {
                role: "assistant",
                content: "Let me check that for you...",
              },
              true
            );
            const slotResponse = await fetch(
              `https://api.cal.com/v2/slots/available?startTime=${encodeURIComponent(
                start_time
              )}&endTime=${encodeURIComponent(
                end_time
              )}&eventTypeId=${eventTypeId}`,
              {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                },
              }
            );

            const slotJson = await slotResponse.json();
            console.log("Available Slot Response:", slotJson);

            if (slotJson.data) {
              console.log("slot dataa", slotJson.data);
              console.log("slot", slotJson.data.slots);

              for (const date in slotJson.data.slots) {
                console.log("date", date);

                // Access the array of slots for the date
                const slots = slotJson.data.slots[date];

                if (slots && slots.length > 0) {
                  const firstSlot = slots[0]; // Get the first slot
                  console.log("SUCCESS", firstSlot.time); // Log the first time
                  return { success: true, slot: firstSlot.time };
                }
              }
            }
            return { error: "No slots available" };
          } else if (fn.functionName === "book_appointment") {
            const { user_name, user_email, user_phone, appointment_date } =
              args;
            console.log(
              "name",
              "email",
              "phone",
              "app",
              user_name,
              user_email,
              user_phone,
              appointment_date
            );
            console.log("BOOK APPOINTMENT INITIATED");
            const name = user_name;
            const email = user_email;
            const phone = user_phone;
            const appointmentTime = appointment_date;

            // Validate user details and appointment time
            if (!name || !email || !phone || !appointmentTime) {
              console.log("Incomplete appointment details");
              return { error: "Incomplete user details or appointment time" };
            }

            // Prepare the data to send to the booking API
            const bookingData = {
              start: new Date(appointmentTime).toISOString(), // Convert the appointment time to ISO string
              eventTypeId: parseInt(eventTypeId), // Use the event type ID provided
              attendee: {
                name: name,
                email: email,
                phoneNumber: phone,
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Set the time zone
                language: "en",
              },
              metadata: {}, // Optional metadata if any
            };

            // Call the Cal.com API to book the appointment
            const bookingResponse = await fetch(
              "https://api.cal.com/v2/bookings",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "cal-api-version": "2024-08-13",
                },
                body: JSON.stringify(bookingData),
              }
            );

            const bookingJson = await bookingResponse.json();
            console.log("Booking Response:", bookingJson);

            if (bookingJson.status === "success") {
              // Prepare the appointment details message
              const appointmentMessage = `
                New Appointment:
                Name: ${name}
                Email: ${email}
                Phone: ${phone}
                Appointment Time: ${appointmentTime}
                Meeting link: ${bookingJson.data.meetingUrl}
              `;

              // Log the appointment details to simulate booking
              console.log("Appointment Details:", appointmentMessage);

              const notifyResponse = await fetch(
                `${baseurl}/api/daily-bots/send-sms`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    to: phone,
                    from: "+17755879759",
                    message: appointmentMessage,
                  }),
                }
              );

              const notifyJson = await notifyResponse.json();
              console.log("Agency Notification Response:", notifyJson);

              // Return a success response with the booking and agency notification details
              return {
                success: true,
                appointment: bookingJson,
                notifyAgencyResponse: notifyJson,
              };
            } else {
              // If booking fails, return error
              console.log("Booking failed:", bookingJson);
              return { error: "Failed to book the appointment" };
            }
            return { success: true };
          } else if (fn.functionName === "insert_in_ghl") {
            console.log("GHL ARGS", ArrowRightSquareIcon);
            const { user_name, user_email, user_phone, appointment_date } =
              args;
            console.log(
              "name",
              "email",
              "phone",
              "app",
              user_name,
              user_email,
              user_phone,
              appointment_date
            );
            console.log("BOOK APPOINTMENT INITIATED");
            const name = user_name;
            const email = user_email;
            const phone = user_phone;
            const appointmentTime = appointment_date;
            const agent_code = agent_id;

            // Validate user details and appointment time
            if (!name || !email || !phone || !appointmentTime) {
              console.log("Incomplete appointment details");
              return { error: "Incomplete user details or appointment time" };
            }

            // Prepare the data to send to the booking API
            const contactData = {
              name: name,
              email: email,
              phoneNumber: phone,
              agent_code: agent_code,
              schema_name: schema,
            };

            // Call the Cal.com API to book the appointment
            const contactResponse = await fetch(
              `${baseurl}/api/create-ghl-contact/`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  // "schema-name": "0c133d26-972a-47ea-8050-51a943f2d1d0", // Set the API version header
                },
                body: JSON.stringify(contactData),
              }
            );

            const contactJson = await contactResponse.json();
            console.log("Contact Response:", contactJson);

            // If the booking is successful, notify the agency about the new appointment
            if (contactJson.status === "success") {
              const contact_id = contactJson.contactId;

              // Log the appointment details to simulate booking
              console.log(" contact id", contact_id);
              const schema_name = schema; // Example appointment ID
              const agent_code = agent_id; // Example lead ID
              const url = `${baseurl}/api/agent/leadconnect/appointment/${schema_name}/${agent_code}/`;

              const ghlResponse = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  lead_name: user_name, // Example agency phone number
                  contact_id: user_phone, // Example sending phone number
                }),
              });

              const ghlJson = await ghlResponse.json();
              console.log("GJHL  Response:", ghlJson);

              // Return a success response with the booking and agency notification details
              return {
                success: true,
              };
            } else {
              // If booking fails, return error
              console.log("Booking failed:");
              return { error: "Failed to book the appointment" };
            }
          } else if (fn.functionName === "end_function") {
            console.log("Call Ended");
          } else {
            console.log("Unhandled Function Call:", fn.functionName);
            return { error: "Function not supported" };
          }
        });

        setClient(newClient);
      } catch (error) {
        console.error("Error initializing client:", error);
      }
    };

    initializeClient();
  }, [isAgentDataLoaded]);

  return (
    <RTVIClientProvider client={client!}>
      <RTVIClientAudio />
      <Videobot />
    </RTVIClientProvider>
  );
}

export default App;
