import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Switch, Route, Link, useParams } from 'react-router-dom';
import moment from 'moment-timezone';
import './light.css';
import { Container, Divider, Dropdown, Form, Grid, Header, Icon, Image, Menu, Message, Segment, Table } from 'semantic-ui-react';
import { statusColor, BasicTable, staticUrl, requester } from './utils.js';
import { LoginForm, SignupForm } from './LoginSignup.js';
import { AccountForm } from './Account.js';
import { PayPalSubscribeDeal } from './PayPal.js';

function MemberInfo(props) {
	const user = props.user;
	const member = user.member;

	const lastTrans = user.transactions && user.transactions.slice(0,3);
	const lastCard = user.cards && user.cards.sort((a, b) => a.last_seen_at < b.last_seen_at)[0];

	return (
		<div>
			<Grid stackable>
				<Grid.Column width={5}>
					<Image
						size='small'
						src={member.photo_medium ? staticUrl + '/' + member.photo_medium : '/nophoto.png'}
					/>
				</Grid.Column>

				<Grid.Column width={11}>
					<Header size='large'>{member.preferred_name} {member.last_name}</Header>

					<BasicTable>
						<Table.Body>
							<Table.Row>
								<Table.Cell>Status:</Table.Cell>
								<Table.Cell>
									<Icon name='circle' color={statusColor[member.status]} />
									{member.status || 'Unknown'}
								</Table.Cell>
							</Table.Row>
							<Table.Row>
								<Table.Cell>Expiry:</Table.Cell>
								<Table.Cell>{member.expire_date}</Table.Cell>
							</Table.Row>
						</Table.Body>
					</BasicTable>
				</Grid.Column>
			</Grid>

			{!member.photo_medium && <Message>
				<Message.Header>Welcome, new member!</Message.Header>
				<p>
					<a href={staticUrl + '/' + member.member_forms} target='_blank'>
						Click here
					</a> to view your application forms.
				</p>
			</Message>}

			{!!lastTrans.length && !member.photo_medium && <Message warning>
				<Message.Header>Please set a member photo!</Message.Header>
				<p>Visit the <Link to='/account'>account settings</Link> page to set one.</p>
			</Message>}

			{!lastTrans.length && <div>
				<Header size='medium'>PayPal</Header>
				<p>Create a ${user.member.monthly_fees} / month subscription, get your first three months for the price of two:</p>
				<PayPalSubscribeDeal
					amount={user.member.monthly_fees}
					name='Protospace Membership'
					custom={JSON.stringify({ deal: 3, member: user.member.id })}
				/>
			</div>}

			<Header size='medium'>Details</Header>
			<BasicTable>
				<Table.Body>
					<Table.Row>
						<Table.Cell>Application:</Table.Cell>
						<Table.Cell>{member.application_date || 'Unknown'}</Table.Cell>
					</Table.Row>
					<Table.Row>
						<Table.Cell>Start:</Table.Cell>
						<Table.Cell>{member.current_start_date || 'Unknown'}</Table.Cell>
					</Table.Row>
					<Table.Row>
						<Table.Cell>Vetted:</Table.Cell>
						<Table.Cell>{member.vetted_date || 'Not vetted'}</Table.Cell>
					</Table.Row>
					<Table.Row>
						<Table.Cell>Monthly:</Table.Cell>
						<Table.Cell>${member.monthly_fees || 'Unknown'}</Table.Cell>
					</Table.Row>
					<Table.Row>
						<Table.Cell>Card Number:</Table.Cell>
						<Table.Cell>
							{lastCard && lastCard.card_number || 'None'}
							{user.cards.length > 1 && <Link to='/cards'> [more]</Link>}
						</Table.Cell>
					</Table.Row>
				</Table.Body>
			</BasicTable>

			{member.photo_medium && <p>
				<a href={staticUrl + '/' + member.member_forms} target='_blank'>
					View application forms
				</a>
			</p>}

			<Header size='medium'>Latest Transactions</Header>
			<BasicTable>
				<Table.Body>
					{lastTrans.length ?
						lastTrans.map(x =>
							<Table.Row key={x.id}>
								<Table.Cell>
									<Link to={'/transactions/'+x.id}>{x.date}</Link>
								</Table.Cell>
								<Table.Cell>{x.account_type}</Table.Cell>
								<Table.Cell>${x.amount}</Table.Cell>
							</Table.Row>
						)
					:
						<Table.Row><Table.Cell>None</Table.Cell></Table.Row>
					}
				</Table.Body>
			</BasicTable>
		</div>
	);
};

export function Home(props) {
	const { user } = props;
	const [stats, setStats] = useState(JSON.parse(localStorage.getItem('stats', 'false')));

	useEffect(() => {
		requester('/stats/', 'GET')
		.then(res => {
			setStats(res);
			localStorage.setItem('stats', JSON.stringify(res));
		})
		.catch(err => {
			console.log(err);
			setStats(false);
		});
	}, []);

	const getStat = (x) => stats && stats[x] ? stats[x] : '?';
	const getDateStat = (x) => stats && stats[x] ? moment.utc(stats[x]).tz('America/Edmonton').format('ll') : '?';

	return (
		<Container>
			<Grid stackable padded columns={2}>
				<Grid.Column>
					{user ?
						user.member.set_details ?
							<MemberInfo user={user} />
						:
							<div>
								<Message warning>
									<Message.Header>Please submit your member details</Message.Header>
									<p>Press submit at the bottom if everything's correct.</p>
								</Message>

								<AccountForm {...props} />
							</div>
					:
						<div>
							<LoginForm {...props} />

							<Divider section horizontal>Or</Divider>

							<SignupForm {...props} />
						</div>
					}
				</Grid.Column>
				<Grid.Column>
					<Segment>
						<Header size='medium'>Home</Header>
						<p>Welcome to the Protospace member portal! Here you can view member info, join classes, and manage your membership.</p>

						<Header size='medium'>Quick Links</Header>
						<p><a href='http://protospace.ca/' target='_blank' rel='noopener noreferrer'>Main Website</a></p>
						<p><a href='http://wiki.protospace.ca/Welcome_to_Protospace' target='_blank' rel='noopener noreferrer'>Protospace Wiki</a></p>
						<p><a href='https://groups.google.com/forum/#!forum/protospace-discuss' target='_blank' rel='noopener noreferrer'>Discussion Google Group</a></p>
						<p><a href='https://groups.google.com/forum/#!forum/protospace-administration' target='_blank' rel='noopener noreferrer'>Admin Google Group</a></p>
						{!!user && <p><a href='https://drive.google.com/open?id=0By-vvp6fxFekfmU1cmdxaVRlaldiYXVyTE9rRnNVNjhkc3FjdkFIbjBwQkZ3MVVQX2Ezc3M' target='_blank' rel='noopener noreferrer'>Google Drive</a></p>}

						<img className='swordfish' src='/swordfish.png' />

						<div>
							<Header size='medium'>Protospace Stats</Header>
							<p>Next member meeting: {getDateStat('next_meeting')}</p>
							<p>Next monthly clean: {getDateStat('next_clean')}</p>
							<p>Member count: {getStat('member_count')}</p>
							<p>Green members: {getStat('green_count')}</p>
							<p>Old members: {getStat('paused_count')}</p>
							<p>Bay 108 (metal) temp: {getStat('bay_108_temp')} °C</p>
							<p>Bay 110 (wood) temp: {getStat('bay_110_temp')} °C</p>
						</div>

					</Segment>
				</Grid.Column>
			</Grid>
		</Container>
	);
};
