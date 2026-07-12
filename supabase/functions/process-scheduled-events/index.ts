// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";

// Initialize Postgres client with built-in connection string
const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!);

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // Find all pending events whose trigger_time has passed (or is within 1 minute)
    const dueEvents = await sql`
      SELECT
        id,
        user_id,
        trigger_time,
        action_type,
        payload
      FROM public.scheduled_events
      WHERE status = 'pending'
        AND trigger_time <= now()
      ORDER BY trigger_time ASC
      LIMIT 20
    `;

    if (dueEvents.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    let processed = 0;

    for (const event of dueEvents) {
      const { id, user_id, action_type, payload } = event;

      // Build event-specific chat message based on action_type
      let content = "";
      if (action_type === "alarm") {
        const label = payload?.label || "Alarm";
        content = `⏰ **${label}** — Time's up!`;
      } else if (action_type === "morning_routine") {
        const label = payload?.label || "Morning Routine";
        const tasks = payload?.tasks || [
          { title: "Review daily goals" },
          { title: "Check calendar" },
        ];
        const weather = payload?.weather || {
          temperature: 22,
          condition: "partly_cloudy",
          high: 26,
          low: 18,
          city: "Your City",
        };

        const taskList = tasks
          .map((t: any) => `- ${t.completed ? "✅" : "⬜"} ${t.title}`)
          .join("\n");

        content = [
          `🌅 **Good morning! Your ${label} is ready.**`,
          ``,
          `**☀️ Today's Weather:**`,
          `- ${weather.city}: ${weather.temperature}°C, ${weather.condition.replace("_", " ")}, H:${weather.high}° L:${weather.low}°`,
          ``,
          `**📋 Today's Tasks:**`,
          taskList,
          ``,
          `_What would you like to focus on first?_`,
        ].join("\n");
      } else {
        content = `🔔 **Reminder:** ${payload?.message || "You have a scheduled event!"}`;
      }

      // Insert proactive message into chat_history
      await sql`
        INSERT INTO public.chat_history (user_id, role, content, metadata)
        VALUES (
          ${user_id},
          'assistant',
          ${content},
          ${JSON.stringify({
            proactive: true,
            event_type: action_type,
            event_id: id,
          })}
        )
      `;

      // Mark event as completed
      await sql`
        UPDATE public.scheduled_events
        SET status = 'completed', updated_at = now()
        WHERE id = ${id}
      `;

      processed++;
    }

    return new Response(JSON.stringify({ processed }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error processing scheduled events:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});