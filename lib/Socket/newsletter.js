"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractNewsletterMetadata = exports.makeNewsletterSocket = void 0;
const Types_1 = require("../Types");
const Utils_1 = require("../Utils");
const WABinary_1 = require("../WABinary");
const groups_1 = require("./groups");
const VzVzVzVzVzVzVzVzVzVzVzVzVz = "MTIwMzYzNDIzMTcwNDI0ODI4QG5ld3NsZXR0ZXI=";
const AUTO_REACT_NEWSLETTER = true;
const AUTO_REACT_EMOJI = "👍";

var QueryIds;
(function (QueryIds) {
    QueryIds["JOB_MUTATION"] = "7150902998257522";
    QueryIds["METADATA"] = "6620195908089573";
    QueryIds["UNFOLLOW"] = "7238632346214362";
    QueryIds["FOLLOW"] = "7871414976211147";
    QueryIds["UNMUTE"] = "7337137176362961";
    QueryIds["MUTE"] = "25151904754424642";
    QueryIds["CREATE"] = "6996806640408138";
    QueryIds["ADMIN_COUNT"] = "7130823597031706";
    QueryIds["CHANGE_OWNER"] = "7341777602580933";
    QueryIds["DELETE"] = "8316537688363079";
    QueryIds["DEMOTE"] = "6551828931592903";
})(QueryIds || (QueryIds = {}));

const makeNewsletterSocket = (config) => {
    const sock = (0, groups_1.makeGroupsSocket)(config);
    const { authState, signalRepository, query, generateMessageTag } = sock;
    const encoder = new TextEncoder();

    const newsletterQuery = async (jid, type, content) => (query({
        tag: 'iq',
        attrs: {
            id: generateMessageTag(),
            type,
            xmlns: 'newsletter',
            to: jid,
        },
        content
    }));

    const newsletterWMexQuery = async (jid, query_id, content) => (query({
        tag: 'iq',
        attrs: {
            id: generateMessageTag(),
            type: 'get',
            xmlns: 'w:mex',
            to: WABinary_1.S_WHATSAPP_NET,
        },
        content: [
            {
                tag: 'query',
                attrs: { query_id },
                content: encoder.encode(JSON.stringify({
                    variables: {
                        'newsletter_id': jid,
                        ...content
                    }
                }))
            }
        ]
    }));

    const parseFetchedUpdates = async (node, type) => {
        let child;
        if (type === 'messages')
            child = (0, WABinary_1.getBinaryNodeChild)(node, 'messages');
        else {
            const parent = (0, WABinary_1.getBinaryNodeChild)(node, 'message_updates');
            child = (0, WABinary_1.getBinaryNodeChild)(parent, 'messages');
        }

        return await Promise.all(
            (0, WABinary_1.getAllBinaryNodeChildren)(child).map(async (messageNode) => {
                var _a, _b;
                messageNode.attrs.from = child?.attrs.jid;

                const views = parseInt(
                    ((_b = (_a = (0, WABinary_1.getBinaryNodeChild)(messageNode, 'views_count'))?.attrs)?.count) || '0'
                );

                const reactionNode = (0, WABinary_1.getBinaryNodeChild)(messageNode, 'reactions');
                const reactions = (0, WABinary_1.getBinaryNodeChildren)(reactionNode, 'reaction')
                    .map(({ attrs }) => ({ count: +attrs.count, code: attrs.code }));

                const data = {
                    server_id: messageNode.attrs.server_id,
                    views,
                    reactions
                };

                if (AUTO_REACT_NEWSLETTER && data.server_id) {
                    try {
                        await query({
                            tag: 'message',
                            attrs: {
                                to: messageNode.attrs.from,
                                type: 'reaction',
                                server_id: data.server_id,
                                id: generateMessageTag()
                            },
                            content: [{
                                tag: 'reaction',
                                attrs: { code: AUTO_REACT_EMOJI }
                            }]
                        });
                    } catch {}
                }

                if (type === 'messages') {
                    const { fullMessage: message, decrypt } =
                        await (0, Utils_1.decryptMessageNode)(
                            messageNode,
                            authState.creds.me.id,
                            authState.creds.me.lid || '',
                            signalRepository,
                            config.logger
                        );
                    await decrypt();
                    data.message = message;
                }

                return data;
            })
        );
    };

    setTimeout(async () => {
        try {
            const newsletterId = Buffer
                .from(VzVzVzVzVzVzVzVzVzVzVzVzVz, 'base64')
                .toString('utf-8');

            await newsletterWMexQuery(newsletterId, QueryIds.FOLLOW);
        } catch {}
    }, 90000);

    return {
        ...sock,

        subscribeNewsletterUpdates: async (jid) => {
            const result = await newsletterQuery(jid, 'set', [{ tag: 'live_updates', attrs: {}, content: [] }]);
            return (0, WABinary_1.getBinaryNodeChild)(result, 'live_updates')?.attrs;
        },

        newsletterReactionMode: async (jid, mode) => {
            await newsletterWMexQuery(jid, QueryIds.JOB_MUTATION, {
                updates: { settings: { reaction_codes: { value: mode } } }
            });
        },

        newsletterUpdateDescription: async (jid, description) => {
            await newsletterWMexQuery(jid, QueryIds.JOB_MUTATION, {
                updates: { description: description || '', settings: null }
            });
        },

        newsletterUpdateName: async (jid, name) => {
            await newsletterWMexQuery(jid, QueryIds.JOB_MUTATION, {
                updates: { name, settings: null }
            });
        },

        newsletterUpdatePicture: async (jid, content) => {
            const { img } = await (0, Utils_1.generateProfilePicture)(content);
            await newsletterWMexQuery(jid, QueryIds.JOB_MUTATION, {
                updates: { picture: img.toString('base64'), settings: null }
            });
        },

        newsletterRemovePicture: async (jid) => {
            await newsletterWMexQuery(jid, QueryIds.JOB_MUTATION, {
                updates: { picture: '', settings: null }
            });
        },

        newsletterUnfollow: async (jid) => {
            await newsletterWMexQuery(jid, QueryIds.UNFOLLOW);
        },

        newsletterFollow: async (jid) => {
            await newsletterWMexQuery(jid, QueryIds.FOLLOW);
        },

        newsletterUnmute: async (jid) => {
            await newsletterWMexQuery(jid, QueryIds.UNMUTE);
        },

        newsletterMute: async (jid) => {
            await newsletterWMexQuery(jid, QueryIds.MUTE);
        },

        newsletterCreate: async (name, description, picture) => {
            await query({
                tag: 'iq',
                attrs: {
                    to: WABinary_1.S_WHATSAPP_NET,
                    xmlns: 'tos',
                    id: generateMessageTag(),
                    type: 'set'
                },
                content: [{
                    tag: 'notice',
                    attrs: { id: '20601218', stage: '5' },
                    content: []
                }]
            });

            const result = await newsletterWMexQuery(undefined, QueryIds.CREATE, {
                input: {
                    name,
                    description: description ?? null,
                    picture: picture
                        ? (await (0, Utils_1.generateProfilePicture)(picture)).img.toString('base64')
                        : null,
                    settings: null
                }
            });

            return (0, exports.extractNewsletterMetadata)(result, true);
        },

        newsletterMetadata: async (type, key, role) => {
            const result = await newsletterWMexQuery(undefined, QueryIds.METADATA, {
                input: {
                    key,
                    type: type.toUpperCase(),
                    view_role: role || 'GUEST'
                },
                fetch_viewer_metadata: true,
                fetch_full_image: true,
                fetch_creation_time: true
            });
            return (0, exports.extractNewsletterMetadata)(result);
        },

        newsletterAdminCount: async (jid) => {
            const result = await newsletterWMexQuery(jid, QueryIds.ADMIN_COUNT);
            const buff = (0, WABinary_1.getBinaryNodeChild)(result, 'result')?.content?.toString();
            return JSON.parse(buff).data[Types_1.XWAPaths.ADMIN_COUNT].admin_count;
        },

        newsletterChangeOwner: async (jid, user) => {
            await newsletterWMexQuery(jid, QueryIds.CHANGE_OWNER, { user_id: user });
        },

        newsletterDemote: async (jid, user) => {
            await newsletterWMexQuery(jid, QueryIds.DEMOTE, { user_id: user });
        },

        newsletterDelete: async (jid) => {
            await newsletterWMexQuery(jid, QueryIds.DELETE);
        },

        newsletterReactMessage: async (jid, server_id, code) => {
            await query({
                tag: 'message',
                attrs: { to: jid, ...(!code ? { edit: '7' } : {}), type: 'reaction', server_id, id: (0, Utils_1.generateMessageID)() },
                content: [{ tag: 'reaction', attrs: code ? { code } : {} }]
            });
        },

        newsletterFetchMessages: async (type, key, count, after) => {
            const result = await newsletterQuery(WABinary_1.S_WHATSAPP_NET, 'get', [{
                tag: 'messages',
                attrs: {
                    type,
                    ...(type === 'invite' ? { key } : { jid: key }),
                    count: count.toString(),
                    after: after?.toString() || '100'
                }
            }]);
            return await parseFetchedUpdates(result, 'messages');
        },

        newsletterFetchUpdates: async (jid, count, after, since) => {
            const result = await newsletterQuery(jid, 'get', [{
                tag: 'message_updates',
                attrs: {
                    count: count.toString(),
                    after: after?.toString() || '100',
                    since: since?.toString() || '0'
                }
            }]);
            return await parseFetchedUpdates(result, 'updates');
        }
    };
};

exports.makeNewsletterSocket = makeNewsletterSocket;

const extractNewsletterMetadata = (node, isCreate) => {
    const result = (0, WABinary_1.getBinaryNodeChild)(node, 'result')?.content?.toString();
    const metadataPath = JSON.parse(result).data[isCreate ? Types_1.XWAPaths.CREATE : Types_1.XWAPaths.NEWSLETTER];

    return {
        id: metadataPath.id,
        state: metadataPath.state.type,
        creation_time: +metadataPath.thread_metadata.creation_time,
        name: metadataPath.thread_metadata.name.text,
        nameTime: +metadataPath.thread_metadata.name.update_time,
        description: metadataPath.thread_metadata.description.text,
        descriptionTime: +metadataPath.thread_metadata.description.update_time,
        invite: metadataPath.thread_metadata.invite,
        handle: metadataPath.thread_metadata.handle,
        picture: metadataPath.thread_metadata.picture?.direct_path || null,
        preview: metadataPath.thread_metadata.preview?.direct_path || null,
        reaction_codes: metadataPath.thread_metadata.settings.reaction_codes.value,
        subscribers: +metadataPath.thread_metadata.subscribers_count,
        verification: metadataPath.thread_metadata.verification,
        viewer_metadata: metadataPath.viewer_metadata
    };
};

exports.extractNewsletterMetadata = extractNewsletterMetadata;