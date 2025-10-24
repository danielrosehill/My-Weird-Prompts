This repository is the start of an attempt to create a unique blog and website: a blog consisting of (some of the) random questions that I prompt AI with, which often provoke unexpectedly interesting outputs.

For a long time, I've felt that there's a gap in the AI "ecosystem": we have a few good systems for version-controlling prompts, but tooling for storing *outputs* (you know, the info you get out of AI and kind of the whole point for using it!) is still relatively thin.

I still don't have a system for storing outputs that I really like. I've tried Obsidian notebooks, creating my own private podcast. And now my Google Drives consist of a random scattering of things I got out of AI that were worth keeping. 

I have been working with static site generators for some time now (it took a while to get the hang of them!) and I've mapped out some ideas for improvements to the podcast workflow. As image to video and text to video become rapidly more feasible, there is likely to be an explosion of fascinating ways in which information gleaned from LLMs in text can be brought to vidid life through the creative modalities we have today.

My idea in creating a public digital garden / wiki / blog from my prompts and outputs is borne out of the fact that I frequently want to share interesting AI outputs with friends/family; often, I want to recall it later; and a large chunk of it doesn't contain anything personal. A lot of it could probably be redacted. So as how I approach most things, I err towards open-sourcing it and will withwhold what's not worth sharing (or which is really private).

The most challenging part of this project, I expect, will be this repository:

My ambition is to use this repo for writing the workflows *and* creating the deploying the content. This is not an ideal design and if I stick with this I will move over to a headless architecture. But I would prefer to get going with it. 

Here are some more details about my workflow which may be relevant in how we architect this: I capture most AI prompts using voice. On mobile, I use an app called Voicenotes (Android). At my computer, I use it or local STT. I capture long prompts but they need to be cleaned up. I have defined a nice processing workflow to do this (that's agent 1 already!). 

Voicenotes is great because it allows you to create webhooks for specific tags. I use this to create tags like "Prompt For Blog" that I can then bind to the workflow in N8N. 

I'll describe here an ideal workflow that would represent this idea executed about as well as I think I could do it at this point in time. The detail is just for color!

- I'm out walking and suddenly I have a random question. Or a technical one. Almost reflexively, I reach for Voice Notes and record my question, which will become the prompt. 
- I think "is there a chance I might want to use this later?", "is it too personal to share?" If no, I say "okay then, I'll tag it Blog Prompt"
- I have no strong desire to do so, but I could equally create my own voice capture frontend for the workflow to avoid the tagging thing. My concern with this is the belief that chunking audio is harder than it seems and then I have to worry about authenticating another resource. 
- In my updated workflow, I use Gemini Pro 2.5 to send audio to for processing. I do this because it allows me to consolidate steps: I can write a system prompt like "organise this into a prompt." Which is really a combined workload: transcribe and then rewrite. 
- The Gemini agent here should return a JSON schema. The objects will be prompt,  context, prompt summary, title, tag(s), excerpt, response. In other words: Gemini is cleaning up my prompt, coming up with a name for the blog post that will share its answer (I may edit later, but it's okay to publish as is), and provide the other entities. The publish date can be inferred from javascript.  Tags can be a JSON object of the websites categories. Prompt summary is a synopsis of my prompt to fit into the blog template and prompt is the cleaned up version of my prompt from the transcript. The prompt and context split is deliberate and important: I discovered that voice prompting can be very powerful because it allows you to capture information very fluidly. Therefore, you can capture a lot of context data that would otherwise be tedious to type out. When I look at my prompt transcripts, they're often a mixture of prompts (what I'm hoping that the model will provide in its response) and context data which is "padding" that I'm adding as sort of a surrogate for memory. Or in some cases, just to provide context that the model otherwise wouldn't have. In my voice prompt templates, I've split these up into sections to make it easier for the AI tool to parse. So I think it makes sense to feed the model similarly.

My experience with agents so far has been that trying to cram everything into one workload is a bad idea. So this is where I think it makes sense so split the workload:

My "prompt to podcast" workflow was basically a workflow I came up with to listen to long outputs in a private podcast ( I made some episdes public). The methodology was a system prompt: the AI agent was told that its task was to answer the user's prompt but to do so by generating the text for a podcast episode called the "Just Ask AI Podcast" (etc). In this case, it would be the My Weird Prompts podcast. I gave the host a personality and used a character voice. The agent provided its responses in speech markup language so that it could be run through TTS and then (finally) saved to my Google Drive. I got a notification when a new episode was ready and listen to them when I'm out and about. 

My idea with this blog is to integrate these two ideas/projects so that this whole idea can really come to live with multimodal AI. 

Agent 1's response (the text for the podcast) can get fed to agent 2 which generates the accompanying podcast. This can be like my previous workflow (two steps - markup generation then TTS) or more ideally in one. This agent can also generate a title and episode description text. The episodes should include an intro about the project, a disclaimer that the content is AI generated. I would also probably like to have a jingle that gets prepended and then (all automated) normalise the output so that the finished binary is in great condition for playback.

The final step: another agent generates a banner image for the blog that fits the "vibe." Usually I go for a kind of eccentric theme. Down the line, this agent could even generate images for the body text and captions and inline diagrams (etc). But right now ... the cover image would be enough. 

I will lean into your help in lots of ways for this project. But especially in the foregoing (it was previously N8N workflows but I feel like it makes more sense to just run this as a code defined project). And also in the next stages as I'm unsure how to orchestrate them. 

At this point in my model we should have our constituent elements all in place (I'll add some stack notes too): I wrote a prompt. An AI agent (which should have some basic context about me and the purpose of the project) wrote its completion (this very important part of the task should be done with a high reasoning model and may also involve MCP - but right now Sonnet 4.5 would be my choice). The podcast agent generated the audio accompaniament and provided the accompanying metadata. And we have a cover image. 

Now we want to (programatically) create a new post. The categorisation could actually be done here (it might make more sense). I think that cloudinary would be ideal for hosting the audio binaries.

The post text itself would be templated: we show the prompt summary then a header and then the AI response (we may ask the AI post generation agent to create subtitles and a leading header for the output also so that we don't need  to reuse the blog title and each element can be generated with thought). All that's left is metatags and triggering a deploy. The deployment will be through Vercel which I love. 

The frontend can be Astro (it would be my top choice). Assuming that this can't be fully repo deployed the backend could be something like DatoCMS or Contentful. 

The publishing workflow I envision is something like: the workflow generates the post. And I curate the content later (so the post text should bear a disclaimer that this is AI generated and the website will be very clear about this). Note: there's no actual podcast generated but down the road it could be. It's just audio binaries embedded into posts. 

The later part of the workflow would be the manual/human review: I may wish to delete old entries; rewrite or correct the initial AI response; add subheadings; add or recategorise. Essentially I would be curating the information store/wiki down the road. 

Searchability would be key: I would likely use this for my own reference. But it should also be enjoyable to read: it will be public facing and I would be delighted if others found interest in some of the responses I get from AI!

I have some thoughts, too, about how this could be taken even "farther" down the line although right now I don't want to pursue this nor do I think its feasible (especially financially). Namely text to video: creating videos (and maybe even a public video channel!) to create sort of mini documentary episodes from the content that are then embedded. That would be the idea at its full reach, for the time being: what starts as a simple prompt captured with voice note gets fleshed out into a whole world of ideas and information through synthesising all the cool AI modalities that have come online in recent years. 





