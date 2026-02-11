import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const TermsOfService = () => {
    return (
        <div className="min-h-screen bg-background pb-20">
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="mb-6">
                    <Link to="/">
                        <Button variant="ghost" className="pl-0 gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Back to Home
                        </Button>
                    </Link>
                </div>

                <h1 className="text-3xl font-bold mb-2 text-foreground">Terms of Service</h1>
                <p className="text-muted-foreground mb-8">Last updated: February 6, 2026</p>

                <div className="space-y-6 text-foreground/80 leading-relaxed">
                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-foreground">1. Agreement to Terms</h2>
                        <p>
                            By accessing or using the Fast Haazir mobile application or website, you agree to be bound by these Terms of Service
                            and our Privacy Policy. If you do not agree to these terms, please do not use our services.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-foreground">2. Use of Services</h2>
                        <p className="mb-2">
                            You must be at least 18 years old to create an account or use our services. You agree to provide accurate,
                            current, and complete information during the registration process and to update such information to keep it accurate,
                            current, and complete.
                        </p>
                        <p>
                            You are responsible for safeguarding your account password and for any activities or actions under your account.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-foreground">3. Orders and Deliveries</h2>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Placing Orders:</strong> When you place an order, you are offering to purchase products/services. All orders are subject to availability and confirmation of the price.</li>
                            <li><strong>Delivery:</strong> We will aim to deliver your order within the estimated timeframe, but delivery times are not guaranteed.</li>
                            <li><strong>Cancellations:</strong> You may cancel an order within a limited time frame, typically before the restaurant/store has begun preparing it. Fees may apply for late cancellations.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-foreground">4. Acceptable Use</h2>
                        <p>
                            You agree not to use the Service for any unlawful purpose or in any way that interrupts, damages, or impairs the service.
                            Prohibited behavior includes:
                        </p>
                        <ul className="list-disc pl-5 mt-2 space-y-2">
                            <li>Harassing or mistreating riders or business staff.</li>
                            <li>Fraudulent activities, including using stolen payment methods.</li>
                            <li>Attempting to reverse engineer or hack the application.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-foreground">5. Termination</h2>
                        <p>
                            We may terminate or suspend your account specifically if you breach these Terms. Upon termination, your right to use the Service will immediately cease.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-foreground">6. Limitation of Liability</h2>
                        <p>
                            In no event shall Fast Haazir, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-foreground">7. Changes to Terms</h2>
                        <p>
                            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide notice of any changes by posting the new Terms on this page.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-foreground">8. Contact Us</h2>
                        <p>
                            If you have any questions about these Terms, please contact us at:
                        </p>
                        <p className="mt-2 font-medium">Email: 1zarrarmotivations@gmail.com</p>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default TermsOfService;
