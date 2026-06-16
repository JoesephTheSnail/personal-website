import { redirect } from 'next/navigation';

// Contact is now a popup modal triggered from the sidebar.
// If someone visits /contact directly, send them home.
export default function ContactPage() {
  redirect('/');
}
