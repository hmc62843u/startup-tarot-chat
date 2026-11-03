# Conversation-first interaction design

This is a project design approach, not an official OpenUI methodology.

## Outcome and scope

Help an idea-stage marketplace founder choose a practical demand-learning step, inspect its support and save a small plan. This prototype uses authored branches and fictional evidence, not live inference. It explores customer access only; arbitrary founder descriptions are not understood.

## Reference patterns

- [OpenUI Generative UI](https://www.openui.com/docs/agent/core-concepts/generative-ui): streamed interactive responses; distinguish actions that continue the conversation from local updates.
- [OpenUI Lang overview](https://www.openui.com/docs/openui-lang/overview): application-owned component definitions constrain what can be composed.
- [Open Intelligent UI](https://github.com/thesysdev/open-intelligent-ui): working tools inside answers and handwritten gallery examples for prototyping.

These are current conceptual references. The demo retains browser bundle 0.2.1; newer APIs need separate compatibility work.

## Interaction decisions

1. Select fictional evidence availability, then clarify access to potential customers.
2. With customer access, propose the reservation exercise. Without it, propose recruitment first. With neither evidence source, offer an explicitly unvalidated idea that acknowledges customer access while retaining the unsupported, founder-authored plan path.
3. Stream a compact proposal and its reason. Reveal detailed evidence only when requested. Follow-up controls appear after delivery completes; stopping leaves a partial response.
4. A challenge opens a clarification turn. Each proposal records its own constraint so earlier turns retain their meaning after changes and reloads.
5. Editing plan fields is local. Applying the latest suggestion is an explicit draft action; saving accepts the changes. Changing the constraint never automatically replaces a saved plan.
6. The header provides access to the working plan. Plans remain shared by evidence case, as in the existing demo; chat history is not an independent plan-version archive.

OpenUI renders response cards. Application-owned HTML implements branching controls and the plan editor. The prototype does not claim model-generated interactive controls.

## Walkthrough for browser evaluation

- Start a new chat with Both connected. Choose that you can reach customers; expect a reservation proposal.
- Inspect evidence; confirm its fictional origin and limits are visible.
- Draft and save a plan with an evidence criterion.
- In the working plan, choose Rethink this proposal. Select that you cannot reach customers; expect recruitment first.
- Open Working plan; confirm the saved action has not changed. Apply Use latest proposal, review the criterion, and save.
- Refresh the browser (Ctrl+R or F5); confirm the earlier reservation proposal remains intact and the saved working plan contains the revision.
- Start a new chat with Neither. Try both customer-access answers; expect different suggestions labeled Unvalidated idea to adapt, with no claim of supporting records.
- Stop a streaming clarification or proposal and reload; expect it to remain partial. Use the composer to request another turn.
- Check keyboard navigation and phone width, and repeat with the CDN unavailable to assess the text fallback.

Automated tests cover proposal branching, unchanged evidence and the unsupported case. The user completed the guided desktop walkthrough and reported completion after the usability improvements on 2026-11-03. Broader keyboard, mobile, CDN-fallback acceptance and comparison with the PWA remain pending. Evaluate whether a founder can explain the proposal, challenge it, distinguish evidence from assumptions and recover their plan without assistance.

## Next design questions

Test this single exchange before expanding the component library. Further work could add comparisons, richer founder context, plan version history and a persistent artifact panel. Live model integration should follow a defined interaction and evidence contract.
