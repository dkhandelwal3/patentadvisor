// // components/ui/SidebarMenu.tsx
//
// "use client";
//
// import React from "react";
// import { CollapsibleMenuItem } from "./sidebar";
// import Link from "next/link";
//
// const SidebarMenu: React.FC = () => {
//   return (
//     <nav>
//       <ul>
//         <li>
//           <Link href="/dashboard" className="block py-2 px-4 text-gray-700 hover:bg-gray-100 rounded">
//             Dashboard
//           </Link>
//         </li>
//         <li>
//           <CollapsibleMenuItem title="Documents">
//             <ul>
//               <li>
//                 <Link href="/documents/upload" className="block py-1 px-4 text-gray-600 hover:bg-gray-50 rounded">
//                   Upload
//                 </Link>
//               </li>
//               <li>
//                 <Link href="/documents/list" className="block py-1 px-4 text-gray-600 hover:bg-gray-50 rounded">
//                   Your Files
//                 </Link>
//               </li>
//             </ul>
//           </CollapsibleMenuItem>
//         </li>
//         <li>
//           <CollapsibleMenuItem title="Settings">
//             <ul>
//               <li>
//                 <Link href="/settings/profile" className="block py-1 px-4 text-gray-600 hover:bg-gray-50 rounded">
//                   Profile
//                 </Link>
//               </li>
//               <li>
//                 <Link href="/settings/billing" className="block py-1 px-4 text-gray-600 hover:bg-gray-50 rounded">
//                   Billing
//                 </Link>
//               </li>
//             </ul>
//           </CollapsibleMenuItem>
//         </li>
//       </ul>
//     </nav>
//   );
// };
//
// export default SidebarMenu;
