import { useEffect, useState } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "./firebase";

export type Status = "active" | "inactive";

export type CategoryItem = {
  id: string;
  name: string;
  description?: string;
  status: Status;
  createdAt: any;
  createdBy: string;
};

export type SubcategoryItem = {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  categoryName?: string;
  status: Status;
  createdAt: any;
  createdBy: string;
};

export type ServiceProviderItem = {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  subcategoryId: string;
  sla: string;
  status: Status;
  createdAt: any;
  createdBy: string;
};

export type GroupItem = {
  id: string;
  name: string;
  code?: string;
  description?: string;
  type: string;             // Service Desk, L2 Support, etc.
  managerId?: string;       // Reference to users.uid
  managerName?: string;
  emailAlias?: string;
  businessHours?: string;
  timezone?: string;
  escalationGroupId?: string;
  parentGroupId?: string;
  defaultAssigneeId?: string;
  status: Status;           // active/inactive
  autoAssignmentEnabled: boolean;
  roundRobinEnabled: boolean;
  skillTags?: string[];
  queueCapacity?: number;
  region?: string;
  slaPolicyId?: string;
  serviceProviderId?: string;
  memberCount: number;
  openTickets?: number;
  slaCompliance?: number;
  createdAt: any;
  createdBy: string;
  updatedAt?: any;
  updatedBy?: string;
};

export const GROUP_TYPES = [
  "Service Desk",
  "L1 Support",
  "L2 Support",
  "L3 Engineering",
  "Infrastructure Team",
  "Network Team",
  "Security Team",
  "Vendor Support",
  "Field Support",
  "Approval Group"
];

export type GroupMemberItem = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  groupId: string;
  roleInGroup: string;      // Manager, Team Lead, etc.
  isPrimary: boolean;
  availabilityStatus: "available" | "away" | "offline";
  currentWorkload: number;
  skills?: string[];
  status: Status;
  createdAt: any;
  createdBy: string;
};

export const GROUP_MEMBER_ROLES = [
  "Group Manager",
  "Team Lead",
  "Senior Agent",
  "Support Agent",
  "Observer"
];

export type AuditLog = {
  id: string;
  moduleId: string;
  moduleName: string;
  action: "create" | "update" | "delete";
  oldValue: any;
  newValue: any;
  performedBy: string;
  performedByRole: string;
  timestamp: any;
};

// Sort client-side so documents without createdAt are still included
function sortByCreatedAt(a: any, b: any) {
  const aTime = a.createdAt?.seconds ?? a.createdAt?.toMillis?.() ?? 0;
  const bTime = b.createdAt?.seconds ?? b.createdAt?.toMillis?.() ?? 0;
  return aTime - bTime;
}

export function useServiceCatalog() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [subcategories, setSubcategories] = useState<SubcategoryItem[]>([]);
  const [serviceProviders, setServiceProviders] = useState<ServiceProviderItem[]>([]);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [members, setMembers] = useState<GroupMemberItem[]>([]);

  useEffect(() => {
    // NO orderBy — fetch ALL docs and sort client-side
    // This prevents Firestore from silently dropping docs without createdAt
    const unsubs = [
      onSnapshot(query(collection(db, "settings_categories")), (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        docs.sort(sortByCreatedAt);
        setCategories(docs);
      }),
      onSnapshot(query(collection(db, "settings_subcategories")), (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        docs.sort(sortByCreatedAt);
        setSubcategories(docs);
      }),
      onSnapshot(query(collection(db, "settings_service_providers")), (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        docs.sort(sortByCreatedAt);
        setServiceProviders(docs);
      }),
      onSnapshot(query(collection(db, "settings_groups")), (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        docs.sort(sortByCreatedAt);
        setGroups(docs);
      }),
      onSnapshot(query(collection(db, "settings_group_members")), (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        docs.sort(sortByCreatedAt);
        setMembers(docs);
      }),
    ];

    return () => unsubs.forEach((unsubscribe) => unsubscribe());
  }, []);

  return { categories, subcategories, serviceProviders, groups, members };
}

export function getSubcategoriesForCategory(subcategories: SubcategoryItem[], categoryId: string) {
  return subcategories.filter((item) => item.categoryId === categoryId && item.status === "active");
}

export function getServiceProvidersForSubcategory(providers: ServiceProviderItem[], subcategoryId: string) {
  return providers.filter((item) => item.subcategoryId === subcategoryId && item.status === "active");
}

export function getGroupsForServiceProvider(groups: GroupItem[], serviceProviderId: string) {
  return groups.filter((group) => group.serviceProviderId === serviceProviderId && group.status === "active");
}

export function getMembersForGroup(members: GroupMemberItem[], groupId: string) {
  return members.filter((member) => member.groupId === groupId && member.status === "active");
}
