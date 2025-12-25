import ChatInterface from "@/components/ChatInterface";

export default function Home() {
  return (
    <main className="h-screen w-full flex flex-col items-center justify-center p-0 md:p-8 bg-slate-950">
      <div className="w-full max-w-4xl h-full md:h-[90vh] relative z-10">
        <ChatInterface />
      </div>
    </main>
  );
}
