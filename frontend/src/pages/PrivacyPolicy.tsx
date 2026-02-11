import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const PrivacyPolicy = () => {
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

                <h1 className="text-3xl font-bold mb-2 text-foreground">Privacy Policy</h1>
                <p className="text-muted-foreground mb-8">Last updated: February 6, 2026</p>

                <div className="space-y-6 text-foreground/80 leading-relaxed">
                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-foreground">1. Introduction</h2>
                        <p>
                            Welcome to Fast Haazir. We respect your privacy and are committed to protecting your personal data.
                            This privacy policy will inform you as to how we look after your personal data when you visit our website
                            or use our mobile application and tell you about your privacy rights and how the law protects you.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-foreground">2. Data We Collect</h2>
                        <p className="mb-2">
                            We collect data to provide the services you request, to maintain and improve our services,
                            and to ensure the safety of our platform. This includes:
                        </p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Identity Data:</strong> Name, username, or similar identifier.</li>
                            <li><strong>Contact Data:</strong> Delivery address, email address, and telephone numbers.</li>
                            <li><strong>Financial Data:</strong> Payment details (processed securely by third-party payment providers).</li>
                            <li><strong>Transaction Data:</strong> Details about payments to and from you and details of products and services you have purchased from us.</li>
                            <li><strong>Device Data:</strong> Internet protocol (IP) address, your login data, browser type and version, time zone setting and location, operating system and platform.</li>
                            <li><strong>Location Data:</strong> We collect precise or approximate location data from your mobile device if you enable us to do so. This data is used to facilitate deliveries and track order status.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-foreground">3. How We Use Your Data</h2>
                        <p>We use your personal data for the following purposes:</p>
                        <ul className="list-disc pl-5 mt-2 space-y-2">
                            <li>To register you as a new customer.</li>
                            <li>To process and deliver your orders (including managing payments, fees, and charges).</li>
                            <li>To manage our relationship with you (including notifying you about changes to our terms or privacy policy).</li>
                            <li>To enable you to partake in a prize draw, competition, or complete a survey.</li>
                            <li>To administer and protect our business and this website/app (including troubleshooting, data analysis, testing, system maintenance, support, reporting, and hosting of data).</li>
                            <li>To deliver relevant website content and advertisements to you and measure or understand the effectiveness of the advertising we serve to you.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-foreground">4. Data Sharing</h2>
                        <p>
                            We may share your data with:
                        </p>
                        <ul className="list-disc pl-5 mt-2 space-y-2">
                            <li><strong>Service Providers:</strong> Riders/drivers to fulfill your delivery, and businesses (restaurants/stores) to prepare your order.</li>
                            <li><strong>Third Parties:</strong> Payment processors, cloud storage providers, and analytics services.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-foreground">5. Data Security</h2>
                        <p>
                            We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used, or accessed in an unauthorized way, altered, or disclosed. Access to your personal data is limited to those employees, agents, contractors, and other third parties who have a business need to know.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-foreground">6. Your Rights</h2>
                        <p>
                            Under certain circumstances, you have rights under data protection laws in relation to your personal data, including the right to request access, correction, erasure, restriction, transfer, or to object to processing.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-foreground">7. Contact Us</h2>
                        <p>
                            If you have any questions about this privacy policy or our privacy practices, please contact us at:
                        </p>
                        <p className="mt-2 font-medium">Email: 1zarrarmotivations@gmail.com</p>
                        <p className="font-medium">Website: https://fasthaazir.com</p>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
