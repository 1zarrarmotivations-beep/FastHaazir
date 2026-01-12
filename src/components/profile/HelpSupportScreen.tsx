import { ArrowLeft, MessageCircle, Phone, Mail, ChevronRight, FileText, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface HelpSupportScreenProps {
  onBack: () => void;
}

const HelpSupportScreen = ({ onBack }: HelpSupportScreenProps) => {
  const contactOptions = [
    {
      icon: MessageCircle,
      title: 'Live Chat',
      description: 'Chat with our support team',
      action: () => window.open('https://wa.me/923001234567', '_blank'),
    },
    {
      icon: Phone,
      title: 'Call Us',
      description: '+92 300 1234567',
      action: () => window.open('tel:+923001234567'),
    },
    {
      icon: Mail,
      title: 'Email Support',
      description: 'support@fasthaazir.com',
      action: () => window.open('mailto:support@fasthaazir.com'),
    },
  ];

  const faqs = [
    {
      question: 'How do I track my order?',
      answer: 'You can track your order in real-time from the Orders page. Once a rider is assigned, you\'ll see their live location on the map.',
    },
    {
      question: 'Can I cancel my order?',
      answer: 'Yes, you can cancel your order before it\'s picked up by the rider. Go to Orders, find your order, and tap Cancel.',
    },
    {
      question: 'How do I add a delivery address?',
      answer: 'Go to Profile > Saved Addresses > Add New Address. You can either type your address or pick a location on the map.',
    },
    {
      question: 'What payment methods are accepted?',
      answer: 'Currently, we accept Cash on Delivery (COD). More payment options coming soon!',
    },
    {
      question: 'How do I become a rider?',
      answer: 'Go to the Rider Dashboard from the home screen and register with your details. Our team will review your application.',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">Help & Support</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Contact Options */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">CONTACT US</h2>
          <div className="space-y-2">
            {contactOptions.map((option) => {
              const Icon = option.icon;
              return (
                <Card 
                  key={option.title}
                  className="p-4 cursor-pointer hover:shadow-card transition-all"
                  onClick={option.action}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{option.title}</p>
                        <p className="text-sm text-muted-foreground">{option.description}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        {/* FAQs */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            <HelpCircle className="h-4 w-4 inline mr-2" />
            FREQUENTLY ASKED QUESTIONS
          </h2>
          <Card className="overflow-hidden">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <span className="text-left text-sm">{faq.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 text-sm text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Card>
        </section>

        {/* Legal Links */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            <FileText className="h-4 w-4 inline mr-2" />
            LEGAL
          </h2>
          <Card className="divide-y divide-border">
            {['Terms of Service', 'Privacy Policy', 'Refund Policy'].map((item) => (
              <button
                key={item}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <span className="font-medium">{item}</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            ))}
          </Card>
        </section>
      </div>
    </div>
  );
};

export default HelpSupportScreen;
